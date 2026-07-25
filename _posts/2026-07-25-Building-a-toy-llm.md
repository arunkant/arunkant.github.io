---
title: "Building a Toy GPT from Scratch in PyTorch"
description: "Learn how a GPT-style transformer works by building one module at a time in PyTorch. No prior Transformer knowledge required."
categories: [Machine Learning]
tags: [pytorch, transformers, gpt, llm, deep-learning]
---

Have you ever wondered what actually happens inside ChatGPT? I did. So I decided to build the smallest possible version from scratch in PyTorch. No libraries, no pre-trained weights — just matrices, code, and a tiny Shakespeare dataset.

This post is the notebook I used to learn LLM. We will build the model one module at a time. Each module will do one clear thing, and once you understand it, we will snap it into the larger model. By the end, you will have a working character-level language model and a mental model of how GPT works.

## What are we actually building?

A language model is a machine that predicts the next token in a sequence. Feed it `The cat sat on the ...` and it guesses `mat`. Then you append `mat` to the sequence and ask again. Repeat this and the model generates text.

Our model will work at the character level. It reads one character at a time and predicts the next one. It will learn from Shakespeare, so after training it will produce passages that look vaguely Elizabethan.
This is based on Andrej Karpathy's video ["Let's build GPT: from scratch, in code, spelled out"](https://www.youtube.com/watch?v=kCc8FmEb1nY). Watch it, it is great!

The architecture, piece by piece:

1. **Character-level tokenizer** — turn text into numbers.
2. **Bigram baseline** — predict the next character using only the current one.
3. **Self-attention** — let every character look at previous characters.
4. **Multi-head attention** — several attention layers working in parallel.
5. **Transformer block** — attention + computation + stability tricks.
6. **Full GPT model** — embeddings, positional encoding, blocks, and output head.
7. **Training loop** — show the model data and update its weights.
8. **Sampling** — generate text with temperature and top-k.

Let us start.

## Step 0: Prepare the data

Neural networks cannot read strings. We need to turn every character into an integer. The simplest way is to collect every unique character in our dataset and give each one an ID.

```bash
wget -q https://raw.githubusercontent.com/karpathy/char-rnn/refs/heads/master/data/tinyshakespeare/input.txt -O input.txt # Download to disk
```

```python
with open('input.txt', 'r') as f:
    text = f.read()

chars = sorted(list(set(text))) # get sorted unique chars
vocab_size = len(chars) # we will need this later

stoi = {c: i for i, c in enumerate(chars)}  # string to integer
itos = {i: c for i, c in enumerate(chars)}  # integer to string

encode = lambda s: [stoi[c] for c in s]
decode = lambda l: ''.join([itos[i] for i in l])
```

The Shakespeare dataset contains 65 unique characters:

```text
{'\n': 0, ' ': 1, '!': 2, '$': 3, '&': 4, "'": 5, ',': 6,
 '-': 7, '.': 8, '3': 9, ':': 10, ';': 11, '?': 12,
 'A': 13, 'B': 14, 'C': 15, ...
 'a': 39, 'b': 40, 'c': 41, ..., 'z': 64}
```

Let us test the encoder and decoder:

```python
decode(encode("hello world"))
# 'hello world'
```

It works. `encode` turns a string into a list of integers, and `decode` turns that list back into a string.

Now we convert the entire dataset into one long tensor and split it into training and validation sets:

```python
data = torch.tensor(encode(text), dtype=torch.long)
n = int(0.9 * len(data))
train_data = data[:n]
val_data = data[n:]
```

We need one more helper before training: a function that grabs random chunks of text and turns them into input/target pairs. Let us also define the hyperparameters we will use throughout the rest of the post.

```python
# Hyperparameters
block_size = 256      # how many characters the model sees at once (context length)
batch_size = 32       # how many sequences we process in parallel

def get_batch(split, batch_size=4):
    data = train_data if split == 'train' else val_data
    indeces = torch.randint(0, len(data) - block_size, (batch_size,))
    X = torch.stack([data[i:i+block_size] for i in indeces])
    Y = torch.stack([data[i+1:i+block_size+1] for i in indeces])
    return X, Y

X, Y = get_batch('train')
```

`X` is the input batch of shape `(batch_size, block_size)`. `Y` has the same shape and is `X` shifted one character to the right — it is the answer the model should predict at every position.

For example, if `block_size` were 8 and a random chunk started with `hello wo`, then:

```text
X:  h e l l o   w o
Y:  e l l o   w o r
```

At position 0 the model sees `h` and learns to predict `e`. At position 1 it sees `he` and learns to predict `l`, and so on. A single forward pass therefore produces `block_size` independent predictions, which makes training efficient.


## Step 1: A simple baseline — the Bigram model

Before building anything fancy, let us build the simplest possible language model. A **bigram model** predicts the next character using only the current character. If the input is `a`, it learns which characters most often follow `a` in the training data.

How do we implement this? With an **embedding table**. Think of it as a big lookup matrix of shape `(vocab_size, vocab_size)`. Each row corresponds to one input character, and each column corresponds to one possible next character. The value in a cell is a score, called a **logit**, for how likely that next character is. We can use `nn.Embedding` for this.

```python
class BigramLanguageModel(nn.Module):
    def __init__(self, vocab_size):
        super().__init__()
        self.token_embedding_table = nn.Embedding(vocab_size, vocab_size)

    def forward(self, idx, targets=None):
        # idx is (B, T): batch of token sequences
        logits = self.token_embedding_table(idx)  # (B, T, vocab_size)

        if targets is None:
            loss = None
        else:
            B, T, C = logits.shape
            logits = logits.view(B*T, C)
            targets = targets.view(B*T)
            loss = F.cross_entropy(logits, targets)

        return logits, loss
```

Why the `.view(B*T, C)`? PyTorch's `F.cross_entropy` wants a 2D input of shape `(examples, classes)` and a 1D target of shape `(examples,)`. A batch has `B` sequences of length `T`, so we have `B*T` total examples. We flatten them.

Let us add a way to generate text:

```python
    def generate(self, idx, max_new_tokens):
        for _ in range(max_new_tokens):
            logits, _ = self(idx)
            logits = logits[:, -1, :]        # only the last time step
            probs = F.softmax(logits, dim=-1) # convert logits to probs
            idx_next = torch.multinomial(probs, num_samples=1) # sample one token for each batch
            idx = torch.cat((idx, idx_next), dim=1)
        return idx
```

The loop does four things:

1. Run the model on the current sequence.
2. Look only at the prediction for the last character.
3. Turn logits into probabilities with softmax.
4. Sample the next character and append it.

Training the bigram model is straightforward:

```python
model = BigramLanguageModel(vocab_size)
optimizer = torch.optim.AdamW(model.parameters(), lr=1e-3)

for step in range(1000):
    xb, yb = get_batch('train', batch_size) # get training batch
    logits, loss = model(xb, yb)    # forward pass
    optimizer.zero_grad(set_to_none=True)   # reset gradients from previous pass to zero (setting to None is just optimization)
    loss.backward() # calculate gradients
    optimizer.step() # update weights
```

After training, the loss drops to around 2.5 and the output starts to look like English letter pairs and spaces. That is our proof of life: data, model, loss, and optimizer all work.

But a bigram model is limited because it only looks at the current character. To do better, we need context.

## Step 2: The intuition behind self-attention

Imagine you are reading a sentence and trying to predict the next word. You do not look only at the previous word; you look at the whole sentence so far. A token at position `t` should be allowed to gather information from all positions `0` through `t-1`.

The simplest way to aggregate past information is to average all previous token vectors. We can do this with a **lower-triangular matrix**. In PyTorch, `torch.tril` creates a matrix where every entry on or below the diagonal is 1, and everything above is 0.

```python
T = 4
wei = torch.tril(torch.ones(T, T))
print(wei)
# tensor([[1., 0., 0., 0.],
#         [1., 1., 0., 0.],
#         [1., 1., 1., 0.],
#         [1., 1., 1., 1.]])
```

If we normalize each row so it sums to 1, we get a running average:

```python
wei = wei / wei.sum(1, keepdim=True)
```

Row 0 averages just token 0. Row 1 averages tokens 0 and 1. Row 3 averages tokens 0 through 3. This enforces the rule that a token can only look at the past.

But a plain average is too simple. Every past token is treated equally. If the context is `The cat sat on the` and we are trying to predict the next word, a uniform average would weight `The` just as heavily as `sat`. That is wrong: `sat` tells us far more about what comes next (a piece of furniture, perhaps) than the article at the start of the sentence.

Self-attention fixes this by learning which past tokens matter for each current token.

## Step 3: Queries, Keys, and Values

Self-attention gives every token three vectors:

- **Query**: "What am I looking for?"
- **Key**: "What do I contain?"
- **Value**: "What will I communicate if I am attended to?"

To decide how much token `i` should attend to token `j`, we compute the dot product of token `i`'s Query with token `j`'s Key. A high score means "these two are relevant to each other." We then use those scores as weights to sum the Values.

Here is a single attention head:

```python
class Head(nn.Module):
    def __init__(self, embedding_dim, head_size, block_size):
        super().__init__()
        self.key = nn.Linear(embedding_dim, head_size, bias=False)
        self.query = nn.Linear(embedding_dim, head_size, bias=False)
        self.value = nn.Linear(embedding_dim, head_size, bias=False)
        self.register_buffer('tril', torch.tril(torch.ones(block_size, block_size)))

    def forward(self, x):
        B, T, C = x.shape
        k = self.key(x)    # (B, T, head_size)
        q = self.query(x)  # (B, T, head_size)
        v = self.value(x)  # (B, T, head_size)

        # Compute attention scores
        wei = q @ k.transpose(-2, -1)  # (B, T, T)
        wei = wei * (C ** -0.5)        # scale by sqrt(head_size)

        # Mask out future positions
        wei = wei.masked_fill(self.tril[:T, :T] == 0, float('-inf'))
        wei = F.softmax(wei, dim=-1)

        # Weighted sum of values
        out = wei @ v  # (B, T, head_size)
        return out
```

Let us walk through the shapes. `q` and `k` are both `(B, T, head_size)`. To get an affinity matrix of shape `(B, T, T)`, we transpose `k` so the inner dimensions match: `(B, T, head_size) @ (B, head_size, T)` gives `(B, T, T)`.

We scale by `sqrt(head_size)` because large dot products push softmax into flat regions where gradients vanish.

The mask `self.tril[:T, :T]` is crucial. It sets future positions to negative infinity before softmax, so they receive zero weight. We slice it because during generation the sequence length `T` may be smaller than `block_size`. Without the slice, PyTorch broadcasting inflates a `(B, 1, 1)` attention matrix into `(B, block_size, block_size)` and everything crashes. I hit that exact bug while building this.

We register `tril` as a buffer so it moves to the GPU with the model. A plain tensor attribute would stay on the CPU and cause a device mismatch error.

## Step 4: Multi-head attention

One attention head learns one kind of relationship. But language has many kinds: subject-verb agreement, punctuation, rhyme, and so on. So we run several heads in parallel and concatenate their outputs.

```python
class MultiHeadAttention(nn.Module):
    def __init__(self, embedding_dim, head_size, num_heads, block_size):
        super().__init__()
        self.heads = nn.ModuleList([
            Head(embedding_dim, head_size, block_size) for _ in range(num_heads)
        ])
        self.proj = nn.Linear(num_heads * head_size, embedding_dim)

    def forward(self, x):
        out = torch.cat([h(x) for h in self.heads], dim=-1)
        return self.proj(out)
```


If each head outputs `(B, T, head_size)` and we have `num_heads` of them, concatenation gives `(B, T, num_heads * head_size)`. We set `head_size * num_heads = embedding_dim` so the concatenated result has the same width as the residual stream. The projection layer then mixes the outputs of all heads back into a single `(B, T, embedding_dim)` tensor.

Why do we need the projection? Each head looks for a different kind of relationship, so their outputs are not automatically compatible. The projection learns how to combine them: for example, it can down-weight a head that is noisy and amplify a head that captured something useful. It is also what lets multi-head attention plug cleanly into the residual connection around the block.

Notice `nn.ModuleList`. If you use a plain Python list, PyTorch will not register the heads as submodules, and their parameters will not move to the GPU. I learned that the hard way too.

## Step 5: The Transformer block

After attention, each token has gathered context from the past. Now it needs to think about that context. A **feed-forward network** gives each token its own private computation step.

The standard design expands the embedding dimension by 4, applies a non-linearity, and projects back down:

Why expand by 4? Attention mixes information *across* positions; the feed-forward layer then gives each token extra capacity to process that mixed information *within* its own vector. Widening the hidden layer lets the network learn richer per-token transformations without increasing the model's external width.

Why a non-linearity? Without something like ReLU, composing linear layers would collapse into a single linear map, no matter how deep the network. The non-linearity lets the model bend and combine features in ways that pure matrix multiplications cannot.

```python
class Block(nn.Module):
    def __init__(self, embedding_dim, head_size, num_heads, block_size):
        super().__init__()
        self.mha = MultiHeadAttention(embedding_dim, head_size, num_heads, block_size)
        self.layer1 = nn.Linear(embedding_dim, 4 * embedding_dim)
        self.relu = nn.ReLU()
        self.layer2 = nn.Linear(4 * embedding_dim, embedding_dim)
        self.norm1 = nn.LayerNorm(embedding_dim)
        self.norm2 = nn.LayerNorm(embedding_dim)

    def feed_forward(self, x):
        x = self.layer1(x)
        x = self.relu(x)
        x = self.layer2(x)
        return x

    def forward(self, x):
        x = x + self.mha(self.norm1(x))
        x = x + self.feed_forward(self.norm2(x))
        return x
```

Two things make deep Transformers trainable:

1. **Residual connections** (`x = x + ...`). When you add the input to the output, you create a shortcut for gradients during backpropagation. Without this, gradients in deep networks shrink to zero and the early layers stop learning.

2. **Layer normalization** (`nn.LayerNorm`). It normalizes the features of each token to have mean 0 and standard deviation 1, which keeps activations stable as the network gets deeper.

We use the **pre-norm** formulation: normalize before the sublayer, apply the sublayer, then add the residual. This is the modern standard.

## Step 6: Putting it all together — ToyGPT

Now we assemble the full model. We need three more pieces:

1. **Token embeddings** convert input IDs into vectors.
2. **Positional embeddings** tell the model where each token is in the sequence. Without them, "dog bites man" and "man bites dog" would look identical to attention. This will also be learnt in training phase.
3. **Language modeling head** projects the final token vectors back to vocabulary logits.

```python
class ToyGPT(nn.Module):
    def __init__(self, block_size, vocab_size, embedding_dim, head_size, num_heads):
        super().__init__()
        self.embedding_table = nn.Embedding(vocab_size, embedding_dim)
        self.pos_embedding_table = nn.Embedding(block_size, embedding_dim)
        self.blocks = nn.Sequential(*[
            Block(embedding_dim, head_size, num_heads, block_size)
            for _ in range(4)
        ])
        self.lm_head = nn.Linear(embedding_dim, vocab_size)

    def forward(self, x, targets=None):
        B, T = x.shape

        tok_emb = self.embedding_table(x)
        pos = torch.arange(T, device=x.device)
        pos_embedding = self.pos_embedding_table(pos)

        x = tok_emb + pos_embedding
        x = self.blocks(x)
        logits = self.lm_head(x)  # (B, T, vocab_size)

        if targets is None:
            loss = None
        else:
            B, T, C = logits.shape
            logits = logits.view(B*T, C)
            targets = targets.view(B*T)
            loss = F.cross_entropy(logits, targets)

        return logits, loss
```

The forward pass is a clean pipeline:

```
Token IDs
   ↓
Token embeddings + positional embeddings
   ↓
Stack of Transformer blocks
   ↓
Logits for every next character
```

## Step 7: Training the model

Before training, the model outputs complete randomness:

```python
model = ToyGPT(block_size, vocab_size, embedding_dim, head_size, num_heads)
model = model.to(device)

def sample_with_prompt(model, prompt, max_new_tokens):
    idx = torch.tensor(encode(prompt), dtype=torch.long).unsqueeze(0)
    out = model.generate(idx, max_new_tokens, block_size)
    return decode([x.item() for x in out[0]])

sample_with_prompt(model, '\n', 128)
```

Output:

```text

 TLbVDkoBs!CCxheQaSERriUh-IXHDjQhb;qyhfqOFnHVNN,-D&ymLwo
3Uyx:LvP xIDCzqN,jzwXsADaxegV'zScSvedTFFzgY'WUztEXHXjwTWEehmuz;npWnSLx$
```

This is exactly what we expect: random characters with no structure.

The training loop follows the standard PyTorch recipe:

```python
# Hyperparameters
block_size = 256
embedding_dim = 384
head_size = 64
num_heads = 6
batch_size = 32
learning_rate = 1e-3
max_iters = 1000

optimizer = torch.optim.AdamW(model.parameters(), lr=learning_rate)

print(f"Training on: {device}")

for iter in range(max_iters):
    xb, yb = get_batch('train', batch_size)
    xb, yb = xb.to(device), yb.to(device)

    logits, loss = model(xb, yb)
    optimizer.zero_grad(set_to_none=True)
    loss.backward()
    optimizer.step()

    if iter % 100 == 0:
        print(f"Step {iter}: Loss {loss.item():.4f}")
```

Output:

```text
Training on: cuda
Step 0: Loss 1.6150
Step 100: Loss 1.5678
Step 200: Loss 1.6828
Step 300: Loss 1.5666
Step 400: Loss 1.6022
Step 500: Loss 1.5365
Step 600: Loss 1.5217
Step 700: Loss 1.3181
Step 800: Loss 1.6143
Step 900: Loss 1.4741
```

The loss bounces around because each batch is a random sample of text, but the overall trend is downward. A loss of 1.6 means the model has narrowed the next character down from 65 random choices to about 5 likely ones.

Training for more iterations would push the loss lower and the generated text would become more coherent. One thousand steps is just a quick demo.

## Step 8: Generating text

After training, we generate text by repeatedly predicting the next character. To make the output interesting rather than deterministic, we use **sampling**.

Here is the `generate` method with two knobs:

- **Temperature** divides the logits before softmax. A value below 1 makes the model more confident and repetitive; a value above 1 makes it more random.
- **Top-k sampling** keeps only the `k` most likely next characters and zeroes out the rest, preventing the model from picking extremely rare characters.

```python
    def generate(self, idx, max_new_tokens, block_size, temperature=1.0, top_k=None):
        device = next(self.parameters()).device
        idx = idx.to(device)

        for _ in range(max_new_tokens):
            idx_cond = idx[:, -block_size:]
            logits, _ = self(idx_cond)
            logits = logits[:, -1, :]

            logits = logits / temperature

            if top_k is not None:
                v, _ = torch.topk(logits, min(top_k, logits.size(-1)))
                logits[logits < v[:, [-1]]] = -float('Inf')

            probs = F.softmax(logits, dim=-1)
            idx_next = torch.multinomial(probs, num_samples=1)
            idx = torch.cat((idx, idx_next), dim=1)

        return idx
```

Let us generate 512 characters:

```python
print(sample_with_prompt(model, '\n', 512))
```

Output:

```text

Both do it sbane hate word and iund.

CAPULET:
But to your this life; and yet no show;
Cupident, we makes them sing to me
Behold, he's hear his high o' But, being

ESCALUS:
Here ever faint sperfect sisten
Before lies thee proice, my is solemn age,
Yes farm thing of me,
New take friends my block in a briber
Advifn, thou may not a grief;
And our hand is Contence conjed forth,
Their. A sir, whick have swear,
And with me petor with ingolain,
And grow did confintening: them your honour fathers
No do bay to cheat

```

It is not coherent English, but notice what it learned:

- Character names like `ESCALUS:` and `CAPULET:` followed by colons.
- Play formatting with blank lines between speakers.
- Word-like tokens and punctuation.
- Long-range structure: new lines and capitalization.

The model has 7,241,537 parameters:

```python
total_params = sum(p.numel() for p in model.parameters())
print(total_params)
# 7241537
```

Most of those live in the token/final embeddings and the feed-forward layers.

## Common bugs you will probably hit

If you build this yourself, here are the mistakes I made in `playground.ipynb` so you can avoid them.

**Device mismatch for the mask**

If you create the causal mask as a plain tensor, it stays on the CPU when the model moves to the GPU:

```python
# Wrong
self.tril = torch.tril(torch.ones(block_size, block_size))

# Right
self.register_buffer('tril', torch.tril(torch.ones(block_size, block_size)))
```

**Attention shape crash**

The error `Expected size for first two dimensions of batch2 tensor to be: [1, 256] but got: [1, 1]` means you forgot to transpose the Key tensor. Use `k.transpose(-2, -1)`, not `k.T` on a 3D tensor.

```python
# Wrong
wei = q @ k

# Right
wei = q @ k.transpose(-2, -1)
```

**Broadcasting disaster with the mask**

During generation, `T` can be 1. Always slice the mask:

```python
wei = wei.masked_fill(self.tril[:T, :T] == 0, float('-inf'))
```

**Parameters left on the CPU**

Use `nn.ModuleList` for submodules, not a plain Python list:

```python
# Wrong
self.heads = [Head(...) for _ in range(num_heads)]

# Right
self.heads = nn.ModuleList([Head(...) for _ in range(num_heads)])
```

**Forgetting `super().__init__()`**

Every `nn.Module` subclass needs it. Without it, PyTorch silently ignores the module's parameters.

## The complete script

Here is everything in one file. You can run this end-to-end:

```python
import torch
import torch.nn as nn
import torch.nn.functional as F

# Hyperparameters
block_size = 256
embedding_dim = 384
head_size = 64
num_heads = 6
batch_size = 32
learning_rate = 1e-3
max_iters = 1000
device = 'cuda' if torch.cuda.is_available() else 'cpu'

# Load data
with open('input.txt', 'r') as f:
    text = f.read()

chars = sorted(list(set(text)))
vocab_size = len(chars)
stoi = {c: i for i, c in enumerate(chars)}
itos = {i: c for i, c in enumerate(chars)}


def encode(s):
    return [stoi[c] for c in s]


def decode(l):
    return ''.join([itos[i] for i in l])


data = torch.tensor(encode(text), dtype=torch.long)
n = int(0.9 * len(data))
train_data = data[:n]
val_data = data[n:]


def get_batch(split, batch_size=4):
    data = train_data if split == 'train' else val_data
    indeces = torch.randint(0, len(data) - block_size, (batch_size,))
    X = torch.stack([data[i:i+block_size] for i in indeces])
    Y = torch.stack([data[i+1:i+block_size+1] for i in indeces])
    return X, Y


class Head(nn.Module):
    def __init__(self, embedding_dim, head_size, block_size):
        super().__init__()
        self.key = nn.Linear(embedding_dim, head_size, bias=False)
        self.query = nn.Linear(embedding_dim, head_size, bias=False)
        self.value = nn.Linear(embedding_dim, head_size, bias=False)
        self.register_buffer('tril', torch.tril(torch.ones(block_size, block_size)))

    def forward(self, x):
        B, T, C = x.shape
        k = self.key(x)
        q = self.query(x)
        v = self.value(x)

        wei = q @ k.transpose(-2, -1)
        wei = wei * (C ** -0.5)
        wei = wei.masked_fill(self.tril[:T, :T] == 0, float('-inf'))
        wei = F.softmax(wei, dim=-1)

        out = wei @ v
        return out


class MultiHeadAttention(nn.Module):
    def __init__(self, embedding_dim, head_size, num_heads, block_size):
        super().__init__()
        self.heads = nn.ModuleList([
            Head(embedding_dim, head_size, block_size) for _ in range(num_heads)
        ])
        self.proj = nn.Linear(num_heads * head_size, embedding_dim)

    def forward(self, x):
        out = torch.cat([h(x) for h in self.heads], dim=-1)
        return self.proj(out)


class Block(nn.Module):
    def __init__(self, embedding_dim, head_size, num_heads, block_size):
        super().__init__()
        self.mha = MultiHeadAttention(embedding_dim, head_size, num_heads, block_size)
        self.layer1 = nn.Linear(embedding_dim, 4 * embedding_dim)
        self.relu = nn.ReLU()
        self.layer2 = nn.Linear(4 * embedding_dim, embedding_dim)
        self.norm1 = nn.LayerNorm(embedding_dim)
        self.norm2 = nn.LayerNorm(embedding_dim)

    def feed_forward(self, x):
        x = self.layer1(x)
        x = self.relu(x)
        x = self.layer2(x)
        return x

    def forward(self, x):
        x = x + self.mha(self.norm1(x))
        x = x + self.feed_forward(self.norm2(x))
        return x


class ToyGPT(nn.Module):
    def __init__(self, block_size, vocab_size, embedding_dim, head_size, num_heads):
        super().__init__()
        self.embedding_table = nn.Embedding(vocab_size, embedding_dim)
        self.pos_embedding_table = nn.Embedding(block_size, embedding_dim)
        self.blocks = nn.Sequential(*[
            Block(embedding_dim, head_size, num_heads, block_size) for _ in range(4)
        ])
        self.lm_head = nn.Linear(embedding_dim, vocab_size)

    def forward(self, x, targets=None):
        B, T = x.shape
        tok_emb = self.embedding_table(x)
        pos = torch.arange(T, device=x.device)
        pos_embedding = self.pos_embedding_table(pos)
        x = tok_emb + pos_embedding
        x = self.blocks(x)
        logits = self.lm_head(x)

        if targets is None:
            loss = None
        else:
            B, T, C = logits.shape
            logits = logits.view(B*T, C)
            targets = targets.view(B*T)
            loss = F.cross_entropy(logits, targets)

        return logits, loss

    def generate(self, idx, max_new_tokens, block_size, temperature=1.0, top_k=None):
        device = next(self.parameters()).device
        idx = idx.to(device)

        for _ in range(max_new_tokens):
            idx_cond = idx[:, -block_size:]
            logits, _ = self(idx_cond)
            logits = logits[:, -1, :]

            logits = logits / temperature

            if top_k is not None:
                v, _ = torch.topk(logits, min(top_k, logits.size(-1)))
                logits[logits < v[:, [-1]]] = -float('Inf')

            probs = F.softmax(logits, dim=-1)
            idx_next = torch.multinomial(probs, num_samples=1)
            idx = torch.cat((idx, idx_next), dim=1)

        return idx


def sample_with_prompt(model, prompt, max_new_tokens):
    idx = torch.tensor(encode(prompt), dtype=torch.long).unsqueeze(0)
    out = model.generate(idx, max_new_tokens, block_size)
    return decode([x.item() for x in out[0]])


model = ToyGPT(block_size, vocab_size, embedding_dim, head_size, num_heads)
model = model.to(device)
optimizer = torch.optim.AdamW(model.parameters(), lr=learning_rate)

print(f"Training on: {device}")

for iter in range(max_iters):
    xb, yb = get_batch('train', batch_size)
    xb, yb = xb.to(device), yb.to(device)

    logits, loss = model(xb, yb)
    optimizer.zero_grad(set_to_none=True)
    loss.backward()
    optimizer.step()

    if iter % 100 == 0:
        print(f"Step {iter}: Loss {loss.item():.4f}")

print(sample_with_prompt(model, '\n', 512))
```

## What to try next

You now have a working toy GPT. Here are a few ways to go deeper:

- Train for more iterations or add a learning-rate schedule.
- Add dropout for regularization.
- Swap the character tokenizer for [tiktoken](https://github.com/openai/tiktoken) and train on a larger dataset.
- Implement weight tying between the token embedding and the final language modeling head.
- Read the "Attention Is All You Need" paper and compare it to your code.

The magic of GPT is not that any single piece is complicated. It is that a small set of simple pieces, stacked and trained on enough data, produce something that looks intelligent. Now you know what those pieces are.

Happy building.