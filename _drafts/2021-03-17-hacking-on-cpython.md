Follow guide https://devguide.python.org/setup/

# Clone source
git clone git@github.com:arunkant/cpython.git

# Install dependencies
brew install openssl xz gdbm

# configure
./configure --with-pydebug --with-openssl=$(brew --prefix openssl)

# make
make -s j2


# run under lldb
$ lldb ./python.exe
> b main
> run


```
$ lldb ./python.exe
(lldb) target create "./python.exe"
Current executable set to './python.exe' (x86_64).
(lldb) b main
Breakpoint 1: where = python.exe`main + 22 at python.c:15:25, address = 0x00000001000013b6
(lldb) r
Process 13067 launched: '/Users/arunkant/projects/cpython/python.exe' (x86_64)
Process 13067 stopped
* thread #1, queue = 'com.apple.main-thread', stop reason = breakpoint 1.1
    frame #0: 0x00000001000013b6 python.exe`main(argc=1, argv=0x00007ffeefbfe4f0) at python.c:15:25
   12   int
   13   main(int argc, char **argv)
   14   {
-> 15       return Py_BytesMain(argc, argv);
   16   }
   17   #endif
Target 0: (python.exe) stopped.
(lldb) 
```

# frame info
> fr v
(lldb) fr v
(int) argc = 1
(char **) argv = 0x00007ffeefbfe4f0 

(lldb) bt
* thread #1, queue = 'com.apple.main-thread', stop reason = breakpoint 1.1
  * frame #0: 0x00000001000013b6 python.exe`main(argc=1, argv=0x00007ffeefbfe4f0) at python.c:15:25
    frame #1: 0x00007fff73faa3d5 libdyld.dylib`start + 1

(lldb) gui will enable UI


setup VSCode for debug
{
    // Use IntelliSense to learn about possible attributes.
    // Hover to view descriptions of existing attributes.
    // For more information, visit: https://go.microsoft.com/fwlink/?linkid=830387
    "version": "0.2.0",
    "configurations": [
        {
            "name": "(lldb) Launch",
            "type": "cppdbg",
            "request": "launch",
            "program": "${workspaceFolder}/python.exe",
            "args": ["-c", "print('hello world')"],
            "stopAtEntry": false,
            "cwd": "${workspaceFolder}",
            "environment": [],
            "externalConsole": false,
            "MIMode": "lldb"
        }
    ]
}
    
