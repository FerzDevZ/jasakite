# bpftrace Syscall Latency Script

`bpftrace -e 'tracepoint:syscalls:sys_enter_read { @start[tid] = nsecs; } tracepoint:syscalls:sys_exit_read /@start[tid]/ { @latency = hist(nsecs - @start[tid]); delete(@start[tid]); }'`
