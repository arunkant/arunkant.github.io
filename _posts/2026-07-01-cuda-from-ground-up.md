---
title: CUDA from the Ground Up
layout: post
description: A practical, from-zero guide to writing your first CUDA kernels, understanding the GPU execution model, and optimizing with shared memory, tiling, and streams.
categories: [Programming]
tags: [cuda, c++, gpu, parallel-computing, machine-learning]
---

<nav class="post-toc" markdown="1">
**Contents**
* TOC
{:toc}
</nav>

# CUDA from the Ground Up
{: .no_toc }

## Introduction

If you have written C++ before, CUDA is going to look strangely familiar. Functions are functions, pointers are pointers, and loops still loop. The difference is scale: instead of running one thing at a time, you will run thousands of copies of the same function at once, each one handed a different slice of data.

That scale comes from how GPUs are built. A CPU has a handful of powerful cores designed to finish one task quickly. A GPU has thousands of simpler cores designed to chew through a huge pile of similar tasks. You do not move your whole program to the GPU. You move the parts that look like "do the same operation on a huge pile of data": image filters, matrix math, simulations, reductions, and most of the heavy lifting inside modern machine learning.

The mental shift is from "how do I solve this step by step?" to "how do I split this into many independent pieces?" Once you make that switch, CUDA stops feeling foreign and starts feeling obvious.

In this tutorial we will walk through a few classic kernels together: a vector add, a 2D matrix add, a smoothing filter with shared memory, a tiled matrix multiplication, a parallel reduction, and a multi-stream pipeline. By the end you will understand the execution model, the memory model, and the handful of optimization ideas that make CUDA fast.

You need to be comfortable with C++ pointers, arrays, and memory allocation. You also need access to a CUDA-capable GPU or a free Google Colab instance, which gives you a Tesla T4 and `nvcc` already installed.

## Anatomy of a Kernel

The best way to understand CUDA is to start with the smallest useful program and watch how it grows. So here is a vector add: it takes two arrays, adds them element by element, and writes the result into a third array. This example contains almost every pattern you will use in CUDA, so we will spend some time with it.

```cpp
#include <iostream>
#include <cuda_runtime.h>

__global__ void addVectors(const int* A, const int* B, int* C, int n) {
    int i = blockIdx.x * blockDim.x + threadIdx.x;
    if (i < n) {
        C[i] = A[i] + B[i];
    }
}

int main() {
    const int n = 1000;
    size_t bytes = n * sizeof(int);

    // 1. Host allocation
    int* h_A = new int[n];
    int* h_B = new int[n];
    int* h_C = new int[n];
    for (int i = 0; i < n; ++i) {
        h_A[i] = i;
        h_B[i] = i * 2;
    }

    // 2. Device allocation
    int *d_A, *d_B, *d_C;
    cudaMalloc((void**)&d_A, bytes);
    cudaMalloc((void**)&d_B, bytes);
    cudaMalloc((void**)&d_C, bytes);

    // 3. Copy host -> device
    cudaMemcpy(d_A, h_A, bytes, cudaMemcpyHostToDevice);
    cudaMemcpy(d_B, h_B, bytes, cudaMemcpyHostToDevice);

    // 4. Launch configuration
    int threadsPerBlock = 256;
    int blocksPerGrid = (n + threadsPerBlock - 1) / threadsPerBlock;

    // 5. Kernel launch
    addVectors<<<blocksPerGrid, threadsPerBlock>>>(d_A, d_B, d_C, n);

    // 6. Copy device -> host
    cudaMemcpy(h_C, d_C, bytes, cudaMemcpyDeviceToHost);

    for (int i = 0; i < 5; ++i) {
        std::cout << h_C[i] << " ";
    }
    std::cout << "...\n";

    // 7. Cleanup
    cudaFree(d_A);
    cudaFree(d_B);
    cudaFree(d_C);
    delete[] h_A;
    delete[] h_B;
    delete[] h_C;

    return 0;
}
```

The shape of this program is the same shape as almost every CUDA program you will write. We allocate memory on the CPU (the host), allocate memory on the GPU (the device), copy the input data over, launch a kernel, copy the result back, and clean up both sides. I have left out error checking here so the structure is easy to see; the next section adds the macro you should use in real code.

A kernel is just a C++ function with the `__global__` specifier. It runs on the GPU but is called from the CPU. Kernels must return `void`, so results go back through pointer arguments. Inside `addVectors`, every thread computes a global index `i` and writes one element of `C`. The `if (i < n)` guard is important: kernels are launched in fixed-size blocks, so there are usually extra threads that do not correspond to real data. The guard keeps them from reading or writing out of bounds.

The launch syntax `<<<blocksPerGrid, threadsPerBlock>>>` tells CUDA how many threads to create. Here we launch 4 blocks of 256 threads, for 1,024 threads total. Only the first 1,000 have real work; the rest stay idle because of the guard. The expression `(n + threadsPerBlock - 1) / threadsPerBlock` is integer ceiling division: it rounds `n / threadsPerBlock` up so we always have enough threads.

The kernel call itself is asynchronous. The CPU queues the work and returns immediately. The next `cudaMemcpy` from device to host blocks until the kernel is done, so in this tiny program we get synchronization for free.

CUDA uses three function specifiers to decide where code runs and where it can be called from:

| Specifier | Runs on | Callable from |
|-----------|---------|---------------|
| `__global__` | GPU | CPU |
| `__device__` | GPU | GPU |
| `__host__` | CPU | CPU (this is the default) |

`__global__` functions are your kernel entry points. `__device__` functions are helpers that other GPU code can call. `__host__` is what ordinary C++ already does. A function can even be both `__host__ __device__` if you want the compiler to generate two versions.

Every thread gets a set of built-in coordinates. For a 1D launch, the ones that matter are:

- `threadIdx.x` — position inside the block
- `blockIdx.x` — position of the block inside the grid
- `blockDim.x` — number of threads in the block
- `gridDim.x` — number of blocks in the grid

The global index for a 1D launch is:

```cpp
int i = blockIdx.x * blockDim.x + threadIdx.x;
```

Think of it as: skip all the threads in earlier blocks, then count forward to your seat inside this block. This little formula is the key to almost every 1D kernel.

> **Try it yourself.** If `n` is 1,000 and we launch 4 blocks of 256 threads, which threads do real work and which stay idle? Write down the global index range for each block and confirm the guard condition handles the boundary.

## Threads, Blocks, and Grids

Now that we can launch a kernel, we need to understand how CUDA decides which thread handles which array index. CUDA organizes threads into a hierarchy, and getting comfortable with that hierarchy is the key to writing correct and fast kernels.

A **thread** is one invocation of the kernel. Threads are extremely lightweight; the GPU can switch between them with almost no cost. A **block** is a group of threads that run on the same streaming multiprocessor (SM). Threads in a block can share memory and synchronize with each other, and a block is limited to 1,024 threads on most hardware. A **grid** is the collection of all blocks launched by a single kernel call. Blocks in a grid run independently; you cannot synchronize across blocks.

A 1D launch with 4 blocks of 256 threads looks like this:

```text
Grid
├── Block 0  → threads 0..255
├── Block 1  → threads 256..511
├── Block 2  → threads 512..767
└── Block 3  → threads 768..1023

Each thread computes: i = blockIdx.x * 256 + threadIdx.x
```

The launch configuration `(n + 255) / 256` is the standard way to round up. Without it, `1000 / 256` would truncate to 3 blocks, giving only 768 threads and silently ignoring the last 232 elements. The trick is to add `threadsPerBlock - 1` to the numerator before the integer divide. If there is any remainder, the sum pushes the quotient up by one.

When you round up, you create threads that have no data to process. The kernel must guard those threads:

```cpp
if (i < n) {
    C[i] = A[i] + B[i];
}
```

The extra threads are still launched, still consume registers, and still run through the code. They just do not touch memory. This is normal, and the guard is the standard way to handle it.

There is one more unit hiding inside this hierarchy: a **warp** is a group of 32 threads that the hardware executes together. You do not explicitly launch warps; the GPU bundles threads automatically. Warps matter for performance, especially when threads in the same warp take different branches or access memory in a scattered pattern. We will come back to both ideas, first when we look at memory coalescing and again when we parallelize a reduction.

## The Memory Model

With thread coordinates under our belt, we hit the next obstacle: the GPU has its own memory, completely separate from the CPU's. The host pointer you get from `new` points into system RAM. The device pointer you get from `cudaMalloc` points into GPU VRAM. Kernels can only read and write device memory.

The reason we care is that the PCIe bus between CPU and GPU is fast by everyday standards but glacial by GPU standards. Every transfer is a round trip, so the goal is to move data over once, do as much work as possible on the GPU, and move it back once. The vector add we just wrote is too small for this to matter, but it is the same pattern we will use for every larger kernel.

The full data journey for our vector add looks like this:

```text
     Host (CPU)                         Device (GPU)
   ┌─────────────┐                     ┌─────────────┐
   │   h_A       │ ── cudaMemcpy H→D ─→│   d_A       │
   │   h_B       │ ── cudaMemcpy H→D ─→│   d_B       │
   │   h_C       │ ←── cudaMemcpy D→H ─│   d_C       │
   └─────────────┘                     └─────────────┘
                                              │
                                         addVectors<<< >>>
```

`cudaMalloc` works like `malloc` but allocates in GPU memory. It takes a `void**` and returns a `cudaError_t`. We will wrap it in a macro soon, but the raw call looks like this:

```cpp
int* d_A;
cudaMalloc((void**)&d_A, bytes);
```

`cudaMemcpy` is the workhorse for moving data between host and device. Its four modes are `cudaMemcpyHostToDevice`, `cudaMemcpyDeviceToHost`, `cudaMemcpyDeviceToDevice`, and `cudaMemcpyHostToHost`. The direction argument matters, and mixing it up is a common source of crashes. You can also copy from one device pointer to another with `cudaMemcpyDeviceToDevice`, which is useful when you want to avoid a round trip through the CPU.

`cudaFree` releases device memory. It is safe to call `cudaFree` on a null pointer. Forgetting to call it leaks GPU memory, which is usually scarcer than host memory. Device memory and host memory are managed separately: every `cudaMalloc` needs a `cudaFree`, and every `new[]` needs a `delete[]`.

CUDA also supports Unified Memory, where a single pointer is valid on both host and device and the runtime migrates data automatically. It is convenient for prototyping, but for performance you usually want explicit control. We will stick to explicit copies in this tutorial and revisit Unified Memory another time.

## Two-Dimensional Grids

One-dimensional arrays are fine, but most interesting GPU problems are two-dimensional. Images, matrices, and physical grids all map naturally to a 2D layout, and CUDA supports up to three-dimensional grids and blocks through a struct called `dim3`.

```cpp
dim3 threadsPerBlock(16, 16);              // 256 threads in a 16x16 block
dim3 blocksPerGrid(width / 16, height / 16); // enough blocks to cover the image

processImage<<<blocksPerGrid, threadsPerBlock>>>(d_image, width, height);
```

Inside the kernel, threads have `.x`, `.y`, and `.z` coordinates:

```cpp
int x = blockIdx.x * blockDim.x + threadIdx.x; // column
int y = blockIdx.y * blockDim.y + threadIdx.y; // row
```

The device memory is still one flat array, so a 2D coordinate has to be flattened. Row-major order means each row is `width` elements wide, so row `y` starts at `y * width`:

```cpp
int index = y * width + x;
```

Here is a 2D kernel that adds two matrices. It guards both the width and height boundaries because 2D launches also create extra threads along the edges:

```cpp
__global__ void addMatrix(const int* A, const int* B, int* C,
                          int width, int height) {
    int x = blockIdx.x * blockDim.x + threadIdx.x;
    int y = blockIdx.y * blockDim.y + threadIdx.y;

    if (x < width && y < height) {
        int idx = y * width + x;
        C[idx] = A[idx] + B[idx];
    }
}
```

A 1,024x1,024 matrix with 16x16 blocks needs a 64x64 grid:

```cpp
dim3 block(16, 16);
dim3 grid(1024 / 16, 1024 / 16);
addMatrix<<<grid, block>>>(d_A, d_B, d_C, 1024, 1024);
```

This is the same coordinate pattern we will use for the image blur and the tiled matrix multiply later, so it is worth getting comfortable with it now.

> **Try it yourself.** For a matrix with `width = 10`, what is the flat index of the cell at column 5, row 2? What is the flat index of the cell immediately to its right?

### The halo problem

Many 2D kernels read neighboring pixels. An image blur, for example, needs the pixel to the left and right of each output pixel. If every thread fetches its neighbors directly from global memory, the same pixels are loaded many times. Shared memory fixes that.

Shared memory is a small, fast scratchpad attached to each SM. Threads in the same block can read and write it, and it is roughly two orders of magnitude faster than global memory. You declare it with `__shared__`. The pattern is always the same: load data from global memory into shared memory, call `__syncthreads()` so no thread starts computing before the data is ready, and then compute using the fast shared copy.

Here is a 1D smoothing filter that averages a pixel with its left and right neighbors. This is the same stencil pattern used in image blurs, just collapsed to one dimension so we can focus on the memory mechanics:

```cpp
#define BLOCK_SIZE 256

__global__ void smooth1D(int* input, int* output, int n) {
    __shared__ int cache[BLOCK_SIZE + 2]; // room for left and right halo

    int tid = threadIdx.x;
    int i = blockIdx.x * blockDim.x + tid;

    // Load center value, offset by one to leave room for halos
    cache[tid + 1] = (i < n) ? input[i] : 0;

    // Load halos: edge threads fetch one extra value from global memory
    if (tid == 0) {
        cache[0] = (i > 0) ? input[i - 1] : 0;
    }
    if (tid == blockDim.x - 1) {
        cache[BLOCK_SIZE + 1] = (i < n - 1) ? input[i + 1] : 0;
    }

    __syncthreads();

    if (i < n) {
        int left   = cache[tid];
        int center = cache[tid + 1];
        int right  = cache[tid + 2];
        output[i] = (left + center + right) / 3;
    }
}
```

The extra slots on each side of the shared array are called **halos** or **ghost cells**. They hold the values just outside the block's territory, which are needed by the edge threads. The reason we care is that each halo value is fetched from global memory only once per block, even though multiple threads in the block might need it.

Notice that `__syncthreads()` is called outside the `if (i < n)` guard. If any thread in the block skipped the barrier, the rest would wait forever and the kernel would hang. This is one of the most common ways to deadlock a CUDA kernel, so it is worth remembering.

```text
Block 0 shared cache:
┌────────┬────────────────┬────────┐
│ halo 0 │  values 0..255 │ halo 1 │
└────────┴────────────────┴────────┘
         ↑                ↑
     input[-1]?       input[256]
```

The left halo for the first block has no neighbor, so we pad with 0. The right halo is fetched from the next block's first element. In a real image blur you would pad the image edges in the same way.

## Checking for Errors

CUDA errors are easy to miss. `cudaMalloc` returns an error code, but the `<<<...>>>` kernel launch syntax does not. Kernels run asynchronously, so a crash inside a kernel may not surface until much later. Your CPU code keeps running, and the only symptom is wrong data.

The fix is a small macro and two habits. Here is the macro:

```cpp
#define CUDA_CHECK(call) \
    do { \
        cudaError_t err = call; \
        if (err != cudaSuccess) { \
            std::cerr << "CUDA Error: " << cudaGetErrorString(err) \
                      << " at " << __FILE__ << ":" << __LINE__ << std::endl; \
            exit(EXIT_FAILURE); \
        } \
    } while (0)
```

Wrap every CUDA API call:

```cpp
CUDA_CHECK(cudaMalloc((void**)&d_A, bytes));
CUDA_CHECK(cudaMemcpy(d_A, h_A, bytes, cudaMemcpyHostToDevice));
```

After a kernel launch, check for launch configuration errors with `cudaGetLastError` and then wait for completion with `cudaDeviceSynchronize`:

```cpp
addVectors<<<blocks, threads>>>(d_A, d_B, d_C, n);
CUDA_CHECK(cudaGetLastError());      // catches invalid launch config
CUDA_CHECK(cudaDeviceSynchronize()); // catches runtime errors in the kernel
```

`cudaGetLastError` tells you if the launch itself was illegal, such as asking for too many threads per block. `cudaDeviceSynchronize` waits for the kernel to finish and returns any error that happened while it was running, such as an out-of-bounds memory access. The complete examples from here on all use `CUDA_CHECK`. In small snippets we may leave it out to keep the focus on the algorithm, but in real code you should always check.

## Matrix Multiplication with Tiling

Matrix multiplication is the classic GPU workload. A naive kernel computes each output element as the dot product of a row of `A` and a column of `B`. The problem is memory traffic: every row and every column is read many times by different threads. For large matrices, the GPU spends most of its time waiting for data instead of multiplying.

Tiling uses shared memory as a user-managed cache. A block of threads loads a small square tile of `A` and a tile of `B` into shared memory, computes a partial dot product from those tiles, then loads the next pair of tiles. Each element of global memory is read only once per tile traversal instead of once per output element.

The idea in phases, for a 16x16 tile, looks like this:

```text
Phase 0: load A[0:15][0:15] and B[0:15][0:15] into shared memory
         compute partial sums
Phase 1: load A[0:15][16:31] and B[16:31][0:15]
         compute partial sums
... until the full row/column is covered
```

Here is the tiled kernel. It assumes square matrices and that `width` is a multiple of `TILE_SIZE`.

```cpp
#include <iostream>
#include <cuda_runtime.h>

#define CUDA_CHECK(call) \
    do { \
        cudaError_t err = call; \
        if (err != cudaSuccess) { \
            std::cerr << "CUDA Error: " << cudaGetErrorString(err) \
                      << " at " << __FILE__ << ":" << __LINE__ << std::endl; \
            exit(EXIT_FAILURE); \
        } \
    } while (0)

#define TILE_SIZE 16

// Square matrices only; width must be divisible by TILE_SIZE.
__global__ void tiledMatMul(const int* A, const int* B, int* C, int width) {
    __shared__ int tileA[TILE_SIZE][TILE_SIZE];
    __shared__ int tileB[TILE_SIZE][TILE_SIZE];

    int tx = threadIdx.x;
    int ty = threadIdx.y;

    int row = blockIdx.y * TILE_SIZE + ty;
    int col = blockIdx.x * TILE_SIZE + tx;

    int sum = 0;
    int numPhases = width / TILE_SIZE;

    for (int phase = 0; phase < numPhases; ++phase) {
        // Each thread loads one element of each tile
        tileA[ty][tx] = A[row * width + (phase * TILE_SIZE + tx)];
        tileB[ty][tx] = B[(phase * TILE_SIZE + ty) * width + col];

        __syncthreads();

        for (int k = 0; k < TILE_SIZE; ++k) {
            sum += tileA[ty][k] * tileB[k][tx];
        }

        __syncthreads();
    }

    C[row * width + col] = sum;
}

int main() {
    const int width = 1024;
    const size_t bytes = width * width * sizeof(int);

    int* h_A = new int[width * width];
    int* h_B = new int[width * width];
    int* h_C = new int[width * width];

    for (int i = 0; i < width * width; ++i) {
        h_A[i] = 1;
        h_B[i] = 2;
    }

    int *d_A, *d_B, *d_C;
    CUDA_CHECK(cudaMalloc((void**)&d_A, bytes));
    CUDA_CHECK(cudaMalloc((void**)&d_B, bytes));
    CUDA_CHECK(cudaMalloc((void**)&d_C, bytes));

    CUDA_CHECK(cudaMemcpy(d_A, h_A, bytes, cudaMemcpyHostToDevice));
    CUDA_CHECK(cudaMemcpy(d_B, h_B, bytes, cudaMemcpyHostToDevice));

    dim3 threads(TILE_SIZE, TILE_SIZE);
    dim3 blocks(width / TILE_SIZE, width / TILE_SIZE);

    tiledMatMul<<<blocks, threads>>>(d_A, d_B, d_C, width);
    CUDA_CHECK(cudaGetLastError());
    CUDA_CHECK(cudaDeviceSynchronize());

    CUDA_CHECK(cudaMemcpy(h_C, d_C, bytes, cudaMemcpyDeviceToHost));

    std::cout << "C[0][0] = " << h_C[0] << std::endl;
    std::cout << "C[1023][1023] = " << h_C[width * width - 1] << std::endl;

    CUDA_CHECK(cudaFree(d_A));
    CUDA_CHECK(cudaFree(d_B));
    CUDA_CHECK(cudaFree(d_C));
    delete[] h_A;
    delete[] h_B;
    delete[] h_C;

    return 0;
}
```

The second `__syncthreads()` inside the phase loop is not optional. Without it, a fast warp could start loading the next phase into `tileA` and `tileB` while a slower warp is still reading the previous phase, producing garbage. This is the same synchronization idea we used in the smoothing filter, just inside a loop now.

> **Try it yourself.** Trace through the indices when `TILE_SIZE = 2` and `width = 4`. Which threads load which elements of `A` and `B` in each phase?

## Memory Coalescing and Bank Conflicts

Getting data to the GPU is only half the battle; the other half is making sure the memory system can serve that data efficiently. If the threads in a warp ask for memory in a scattered way, the hardware has to run many separate transactions, and the kernel slows down for no good reason.

### Global memory coalescing

When a warp of 32 threads reads global memory, the hardware does not fetch 32 individual values. It fetches aligned 128-byte chunks. If the 32 threads request 32 consecutive 4-byte integers starting at a 128-byte boundary, the whole request is satisfied in one transaction. That is a **coalesced** access.

```text
Coalesced read:
Thread 0 → addr 0     Thread 1 → addr 4     ... Thread 31 → addr 124
All 32 values fit in one 128-byte transaction.

Uncoalesced read:
Thread 0 → addr 0     Thread 1 → addr 4096  Thread 2 → addr 8192 ...
Each thread needs a separate transaction.
```

In our tiled matrix multiplication, the loads

```cpp
tileA[ty][tx] = A[row * width + (phase * TILE_SIZE + tx)];
tileB[ty][tx] = B[(phase * TILE_SIZE + ty) * width + col];
```

are coalesced because adjacent threads have adjacent `tx` and `col` values, so they read adjacent memory locations. This is one reason tiling is faster than the naive approach: it turns scattered accesses into consecutive ones.

### Shared memory bank conflicts

Shared memory is divided into 32 banks. Consecutive 4-byte words belong to consecutive banks, wrapping around after bank 31. If 32 threads in a warp access 32 different banks, the accesses happen in parallel. If multiple threads access different words in the same bank, the hardware serializes them. That is a **bank conflict**.

The compute loop in our tiled matrix multiply is a nice example of how the hardware helps:

```cpp
for (int k = 0; k < TILE_SIZE; ++k) {
    sum += tileA[ty][k] * tileB[k][tx];
}
```

For `tileA[ty][k]`, every thread in a warp reads the same address at the same time. The hardware detects this and broadcasts the value to all threads at once, so there is no conflict. For `tileB[k][tx]`, adjacent threads read adjacent columns, so they hit different banks. Again, no conflict.

### Padding

If your access pattern forces threads to read down a column instead of across a row, you can get a conflict. The classic fix is to add an unused column to the shared array:

```cpp
__shared__ int tile[16][17]; // padding shifts bank assignments
```

That extra column changes which bank each row starts in, breaking up the conflict pattern. The math does not change; only the memory layout does.

## Parallel Reduction

Suppose you want to sum a million numbers. On a CPU you would loop and accumulate. On a GPU, if a million threads all try to update one shared total, they overwrite each other. You could use `atomicAdd`, but forcing a million threads into a single line destroys the parallelism that makes the GPU fast.

The better approach is a tree reduction in shared memory. Each block reduces its own chunk to a single value, then adds that value to the global total with one `atomicAdd` per block. The reason we care is that this pattern shows up everywhere: sums, maxima, minima, dot products, and any operation that collapses a large array into one number.

```text
Tree reduction inside a block of 8 threads:

sdata: [a0 a1 a2 a3 a4 a5 a6 a7]
stride 4: [a0+a4 a1+a5 a2+a6 a3+a7 a4 a5 a6 a7]
stride 2: [a0+a4+a2+a6 a1+a5+a3+a7 ...]
stride 1: [sum of all 8 ...]
```

Here is the shared-memory reduction kernel:

```cpp
#define BLOCK_SIZE 256

__global__ void sumReduction(const int* input, int* total, int n) {
    __shared__ int sdata[BLOCK_SIZE];

    int tid = threadIdx.x;
    int i = blockIdx.x * blockDim.x + tid;

    sdata[tid] = (i < n) ? input[i] : 0;
    __syncthreads();

    for (int stride = blockDim.x / 2; stride > 0; stride >>= 1) {
        if (tid < stride) {
            sdata[tid] += sdata[tid + stride];
        }
        __syncthreads();
    }

    if (tid == 0) {
        atomicAdd(total, sdata[0]);
    }
}
```

### Warp divergence

The loop above has a subtle problem. In the first round, threads 0..127 are active and threads 128..255 are idle. In the next round, threads 64..127 become idle, and so on. Because a warp executes 32 threads in lockstep, once the active set drops below 32 threads, the warp has both active and inactive lanes. The inactive lanes do not do useful work, but the warp still takes the full time to execute the instruction. This is **warp divergence**.

For the final few rounds the divergence is severe: only one thread is active in the last round, so 31 threads are masked off and waiting. It is not wrong, but it is wasteful.

### The modern fix: warp shuffle

Modern CUDA lets threads in the same warp read each other's registers directly with **shuffle** instructions. The reduction becomes branch-free inside the warp, which eliminates divergence. The idea is to reduce in shared memory down to 32 values, then hand those 32 values to warp 0 and finish with `__shfl_down_sync`:

```cpp
__global__ void sumReductionShuffle(const int* input, int* total, int n) {
    __shared__ int sdata[BLOCK_SIZE];

    int tid = threadIdx.x;
    int i = blockIdx.x * blockDim.x + tid;

    sdata[tid] = (i < n) ? input[i] : 0;
    __syncthreads();

    // Reduce in shared memory down to 32 partial sums
    for (int stride = blockDim.x / 2; stride > 16; stride >>= 1) {
        if (tid < stride) {
            sdata[tid] += sdata[tid + stride];
        }
        __syncthreads();
    }

    // The first warp now holds 32 partial sums. Finish with shuffles.
    if (tid < 32) {
        int warpVal = sdata[tid];

        warpVal += __shfl_down_sync(0xffffffff, warpVal, 16);
        warpVal += __shfl_down_sync(0xffffffff, warpVal, 8);
        warpVal += __shfl_down_sync(0xffffffff, warpVal, 4);
        warpVal += __shfl_down_sync(0xffffffff, warpVal, 2);
        warpVal += __shfl_down_sync(0xffffffff, warpVal, 1);

        if (tid == 0) {
            atomicAdd(total, warpVal);
        }
    }
}
```

The mask `0xffffffff` says all 32 threads participate. Every thread performs the `+=`, so there is no divergence. Some threads compute values we discard, but that is cheaper than branch serialization. Shuffle is also faster than shared memory because it uses registers and avoids bank conflicts.

## Asynchronous Execution and Streams

Up to this point, everything has gone through CUDA's default stream, which synchronizes with the CPU at every copy and kernel launch. That is fine for small programs, but it leaves the GPU idle while data is being copied and the CPU idle while the GPU computes.

CUDA streams fix this. A stream is an ordered queue of operations. Operations in different streams can run concurrently: one stream can copy data while another runs a kernel. To copy asynchronously, the memory must be pinned with `cudaMallocHost`, because the OS is not allowed to page it out during a DMA transfer.

Here is a pipeline that splits an array into four chunks and processes them in four streams:

```cpp
#include <iostream>
#include <cuda_runtime.h>

#define CUDA_CHECK(call) \
    do { \
        cudaError_t err = call; \
        if (err != cudaSuccess) { \
            std::cerr << "CUDA Error: " << cudaGetErrorString(err) \
                      << " at " << __FILE__ << ":" << __LINE__ << std::endl; \
            exit(EXIT_FAILURE); \
        } \
    } while (0)

__global__ void scaleArray(float* data, float scale, int n) {
    int i = blockIdx.x * blockDim.x + threadIdx.x;
    if (i < n) {
        for (int j = 0; j < 50; ++j) {
            data[i] = data[i] * scale + 0.001f;
        }
    }
}

int main() {
    const int numElements = 1 << 20; // 1,048,576
    const int numStreams = 4;
    const int chunkSize = numElements / numStreams;
    const int chunkBytes = chunkSize * sizeof(float);

    // Pinned host memory is required for async copies
    float* h_data;
    CUDA_CHECK(cudaMallocHost((void**)&h_data, numElements * sizeof(float)));

    float* d_data;
    CUDA_CHECK(cudaMalloc((void**)&d_data, numElements * sizeof(float)));

    for (int i = 0; i < numElements; ++i) {
        h_data[i] = 1.0f;
    }

    cudaStream_t streams[numStreams];
    for (int i = 0; i < numStreams; ++i) {
        CUDA_CHECK(cudaStreamCreate(&streams[i]));
    }

    int threadsPerBlock = 256;
    int blocksPerGrid = (chunkSize + threadsPerBlock - 1) / threadsPerBlock;

    for (int i = 0; i < numStreams; ++i) {
        int offset = i * chunkSize;

        CUDA_CHECK(cudaMemcpyAsync(&d_data[offset], &h_data[offset],
                                   chunkBytes, cudaMemcpyHostToDevice,
                                   streams[i]));

        scaleArray<<<blocksPerGrid, threadsPerBlock, 0, streams[i]>>>
            (&d_data[offset], 2.0f, chunkSize);

        CUDA_CHECK(cudaMemcpyAsync(&h_data[offset], &d_data[offset],
                                   chunkBytes, cudaMemcpyDeviceToHost,
                                   streams[i]));
    }

    CUDA_CHECK(cudaDeviceSynchronize());

    std::cout << "First value: " << h_data[0] << std::endl;
    std::cout << "Last value:  " << h_data[numElements - 1] << std::endl;

    for (int i = 0; i < numStreams; ++i) {
        CUDA_CHECK(cudaStreamDestroy(streams[i]));
    }

    CUDA_CHECK(cudaFreeHost(h_data));
    CUDA_CHECK(cudaFree(d_data));

    return 0;
}
```

The kernel launch syntax now has a fourth argument: the stream. The third argument is dynamic shared memory size, which we do not need here.

```cpp
scaleArray<<<blocks, threads, 0, stream>>>(...);
```

`cudaMemcpyAsync`, the kernel launch, and the next `cudaMemcpyAsync` all return immediately. The CPU queues work for each stream and then waits once at the end. In practice, the GPU's copy engine and compute units can overlap, so the total time is closer to the longest single chunk than to the sum of all chunks.

A word of caution about pinned memory: because it is page-locked, the OS cannot swap it out. If you allocate too much, you starve the rest of the system. Use pinned memory as a staging area, not as your primary storage.

## Conclusion / Where to Go Next

You now have the building blocks of CUDA programming: kernels, threads, blocks, grids, device memory, shared memory, tiling, coalescing, reduction, and streams. The pattern is almost always the same: move data to the GPU, launch enough threads to cover the problem, keep memory access patterns regular, and overlap work where you can.

What comes next depends on what you are building:

- **cuBLAS** and **cuDNN** provide highly tuned implementations of linear algebra and deep-learning primitives. Use them before writing your own matrix kernels.
- **Nsight Compute** and **Nsight Systems** are NVIDIA's profilers. They show memory throughput, occupancy, warp divergence, and where your kernel actually spends its time.
- **Cooperative Groups** is a newer API for synchronizing and shuffling at warp, block, and grid levels with cleaner abstractions than raw `__syncthreads`.

The best way to learn CUDA is to write kernels that solve real problems and then profile them. Start simple, measure, and optimize only the parts the profiler tells you are slow. Good luck.
