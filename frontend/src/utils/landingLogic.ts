export type RouteView = "LANDING" | "COMPILER";

export interface CodeSnippet {
  id: string;
  title: string;
  category: string;
  complexity: string;
  description: string;
  code: string;
  compilerFlags: string;
  assemblyPreview: string[];
  simulatedStdin?: string;
  simulatedOutput: string[];
  metrics: {
    compileTimeMs: number;
    execTimeMs: number;
    memoryKb: number;
    binarySizeKb: number;
  };
}

export interface CompilationStage {
  id: string;
  index: string;
  title: string;
  subtitle: string;
  command: string;
  description: string;
  artifactTitle: string;
  artifactLines: string[];
  securityBoundary: string;
}

export interface FeatureSpec {
  id: string;
  index: string;
  title: string;
  kicker: string;
  description: string;
  specLine: string;
  span: "wide" | "normal";
  codeHighlight: string;
}

/**
 * Resolves the active application view from pathname and search string.
 * Supports `/compiler`, `/lab`, `/playground`, `/ide`, and `?autostart=1` or `?view=compiler`.
 */
export function resolveRouteView(pathname: string, search: string): RouteView {
  const cleanPath = (pathname || "/").toLowerCase().replace(/\/+$/, "") || "/";
  if (
    cleanPath === "/compiler" ||
    cleanPath === "/lab" ||
    cleanPath === "/playground" ||
    cleanPath === "/ide"
  ) {
    return "COMPILER";
  }

  const params = new URLSearchParams(search || "");
  if (params.get("autostart") === "1" || params.get("view") === "compiler") {
    return "COMPILER";
  }

  return "LANDING";
}

/**
 * Curated C17 code experiments for the landing page interactive workspace and hero preview.
 * Each snippet can also be opened directly in the real compiler route (`/compiler`).
 */
export const CURATED_C_SNIPPETS: CodeSnippet[] = [
  {
    id: "interactive-scanf",
    title: "Interactive Stdin & Unbuffered Prompts",
    category: "I/O & PTY Stream",
    complexity: "O(1) Space · Unbuffered",
    description:
      "Demonstrates immediate stdout flushing before blocking on scanf() via PrayogCode's pre-included /etc/prayog/init.h constructor hook.",
    code: `#include <stdio.h>

int main() {
    int a, b;

    printf("Enter two numbers: ");
    scanf("%d %d", &a, &b);

    printf("Sum = %d\\n", a + b);
    printf("Product = %d\\n", a * b);

    return 0;
}`,
    compilerFlags: "gcc -O2 -Wall -Wextra -include /etc/prayog/init.h main.c -o main.out -lm",
    assemblyPreview: [
      "main:",
      "  sub     rsp, 24",
      "  lea     rdi, .LC0[rip]        # \"Enter two numbers: \"",
      "  xor     eax, eax",
      "  call    printf@PLT            # Flushed immediately via _IONBF",
      "  lea     rdx, 12[rsp]          # &b",
      "  lea     rsi, 8[rsp]           # &a",
      "  lea     rdi, .LC1[rip]        # \"%d %d\"",
      "  call    __isoc99_scanf@PLT",
      "  mov      esi, DWORD PTR 8[rsp]",
      "  add     esi, DWORD PTR 12[rsp]",
      "  call    printf@PLT",
      "  xor     eax, eax",
      "  add     rsp, 24",
      "  ret"
    ],
    simulatedStdin: "42 58",
    simulatedOutput: [
      "$ gcc -O2 -Wall -Wextra main.c -o main.out",
      "$ ./main.out",
      "Enter two numbers: 42 58",
      "Sum = 100",
      "Product = 2436",
      "Process exited with code 0"
    ],
    metrics: {
      compileTimeMs: 38,
      execTimeMs: 4,
      memoryKb: 1420,
      binarySizeKb: 16.4
    }
  },
  {
    id: "memory-pointers",
    title: "Dynamic Arena & Pointer Arithmetic",
    category: "Systems & Memory",
    complexity: "64-bit Addresses · Stack/Heap",
    description:
      "Inspect contiguous heap allocations, cache-line alignment, and explicit pointer offsets inside the isolated 128 MB cgroup sandbox.",
    code: `#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>

int main(void) {
    size_t count = 4;
    int32_t *arena = (int32_t *)calloc(count, sizeof(int32_t));
    if (!arena) return 1;

    for (size_t i = 0; i < count; ++i) {
        *(arena + i) = (int32_t)((i + 1) * 16);
        printf("slot[%zu] @ %p -> %d\\n", i, (void*)(arena + i), *(arena + i));
    }

    free(arena);
    return 0;
}`,
    compilerFlags: "gcc -O2 -Wall -Wextra -std=c17 main.c -o main.out",
    assemblyPreview: [
      "main:",
      "  push    rbp",
      "  push    rbx",
      "  mov     esi, 4                # sizeof(int32_t)",
      "  mov     edi, 4                # count = 4",
      "  call    calloc@PLT",
      "  test    rax, rax",
      "  je      .L_ERR",
      "  mov     rbp, rax              # arena base pointer",
      ".L_LOOP:",
      "  mov     DWORD PTR [rbp+rbx*4], edx",
      "  call    printf@PLT",
      "  mov     rdi, rbp",
      "  call    free@PLT"
    ],
    simulatedOutput: [
      "$ gcc -O2 -Wall -Wextra main.c -o main.out",
      "$ ./main.out",
      "slot[0] @ 0x7f9a40000b20 -> 16",
      "slot[1] @ 0x7f9a40000b24 -> 32",
      "slot[2] @ 0x7f9a40000b28 -> 48",
      "slot[3] @ 0x7f9a40000b2c -> 64",
      "Process exited with code 0"
    ],
    metrics: {
      compileTimeMs: 41,
      execTimeMs: 2,
      memoryKb: 1560,
      binarySizeKb: 16.8
    }
  },
  {
    id: "quicksort-partition",
    title: "In-Place Hoare Quicksort",
    category: "Algorithms & Sorting",
    complexity: "O(N log N) Time · In-Place",
    description:
      "High-speed recursive partitioning compiled with -O2 tail-call optimization and zero external runtime overhead.",
    code: `#include <stdio.h>

void swap(int *a, int *b) {
    int t = *a; *a = *b; *b = t;
}

void quicksort(int arr[], int low, int high) {
    if (low >= high) return;
    int pivot = arr[(low + high) / 2];
    int i = low, j = high;
    while (i <= j) {
        while (arr[i] < pivot) i++;
        while (arr[j] > pivot) j--;
        if (i <= j) { swap(&arr[i], &arr[j]); i++; j--; }
    }
    quicksort(arr, low, j);
    quicksort(arr, i, high);
}

int main(void) {
    int data[] = {64, 12, 89, 7, 43, 21, 95, 3};
    int n = sizeof(data) / sizeof(data[0]);
    quicksort(data, 0, n - 1);

    printf("Sorted: ");
    for (int i = 0; i < n; i++) printf("%d ", data[i]);
    printf("\\n");
    return 0;
}`,
    compilerFlags: "gcc -O2 -ftree-vectorize -Wall -Wextra main.c -o main.out",
    assemblyPreview: [
      "quicksort:",
      "  cmp     esi, edx",
      "  jge     .L_RET",
      "  lea     eax, [rsi+rdx]",
      "  sar     eax, 1",
      "  movsx   rax, eax",
      "  mov     ecx, DWORD PTR [rdi+rax*4]  # pivot",
      ".L_PARTITION:",
      "  cmp     DWORD PTR [rdi+r8*4], ecx",
      "  jl      .L_INC_I",
      "  call    quicksort"
    ],
    simulatedOutput: [
      "$ gcc -O2 -Wall -Wextra main.c -o main.out",
      "$ ./main.out",
      "Sorted: 3 7 12 21 43 64 89 95 ",
      "Process exited with code 0"
    ],
    metrics: {
      compileTimeMs: 44,
      execTimeMs: 1,
      memoryKb: 1380,
      binarySizeKb: 17.1
    }
  },
  {
    id: "bitwise-sieve",
    title: "Bitwise Prime Sieve & Math Linker",
    category: "Number Theory & -lm",
    complexity: "Bit-Packed Array · <1ms",
    description:
      "Packs boolean flags into 32-bit words using bitwise shifts and masks, linked directly against musl libm (-lm).",
    code: `#include <stdio.h>
#include <stdint.h>
#include <math.h>

#define LIMIT 100

int main(void) {
    uint32_tcomposite[(LIMIT / 32) + 1] = {0};
    int bound = (int)sqrt((double)LIMIT);

    for (int p = 2; p <= bound; p++) {
        if (!(uint32_tcomposite[p >> 5] & (1u << (p & 31)))) {
            for (int i = p * p; i <= LIMIT; i += p)
                uint32_tcomposite[i >> 5] |= (1u << (i & 31));
        }
    }

    int count = 0;
    for (int n = 2; n <= LIMIT; n++) {
        if (!(uint32_tcomposite[n >> 5] & (1u << (n & 31)))) count++;
    }
    printf("Primes up to %d: %d primes found\\n", LIMIT, count);
    return 0;
}`,
    compilerFlags: "gcc -O2 -Wall -Wextra main.c -o main.out -lm",
    assemblyPreview: [
      "main:",
      "  pxor    xmm0, xmm0",
      "  movaps  XMMWORD PTR [rsp], xmm0",
      "  mov     eax, edx",
      "  sar     eax, 5",
      "  and     edx, 31",
      "  bts     DWORD PTR [rsp+rax*4], edx",
      "  lea     rdi, .LC0[rip]",
      "  call    printf@PLT"
    ],
    simulatedOutput: [
      "$ gcc -O2 -Wall -Wextra main.c -o main.out -lm",
      "$ ./main.out",
      "Primes up to 100: 25 primes found",
      "Process exited with code 0"
    ],
    metrics: {
      compileTimeMs: 39,
      execTimeMs: 1,
      memoryKb: 1410,
      binarySizeKb: 16.5
    }
  }
];

export const COMPILATION_STAGES: CompilationStage[] = [
  {
    id: "source-ingest",
    index: "01",
    title: "Source Validation & Unbuffered Injection",
    subtitle: "Monaco Editor → WebSocket Frame",
    command: "ws.send({ type: 'run', code }) // <= 100 KB UTF-8 guard",
    description:
      "Your C source is validated for UTF-8 payload bounds (100 KB ceiling) and written into an isolated ephemeral workspace (/tmp/prayog-*) with /etc/prayog/init.h injected automatically so printf prompts flush before scanf.",
    artifactTitle: "/etc/prayog/init.h + main.c",
    artifactLines: [
      "__attribute__((constructor))",
      "void __init_unbuffered(void) {",
      "    setvbuf(stdout, NULL, _IONBF, 0);",
      "    setvbuf(stderr, NULL, _IONBF, 0);",
      "}"
    ],
    securityBoundary: "100 KB Max Source · Ephemeral mkdtemp Workspace"
  },
  {
    id: "gcc-compile",
    index: "02",
    title: "Direct GCC 13.2 Compilation",
    subtitle: "Alpine 3.20 Container · musl libc",
    command: "gcc -O2 -Wall -Wextra -include /etc/prayog/init.h /workspace/main.c -o /workspace/main.out -lm",
    description:
      "Spawned directly without a shell wrapper (no sh -c). GCC compiles with level-2 optimization, strict warnings, and math library linking inside a network-disconnected container with a 15-second compilation timeout.",
    artifactTitle: "ELF 64-bit LSB Pie Executable",
    artifactLines: [
      "0000000000001149 <main>:",
      "  1149: 55                   push   %rbp",
      "  114a: 48 89 e5             mov    %rsp,%rbp",
      "  114d: 48 83 ec 10          sub    $0x10,%rsp",
      "  1151: 48 8d 3d ac 0e 00 00 lea    0xeac(%rip),%rdi"
    ],
    securityBoundary: "15s Compile Ceiling · Zero Shell Invocation"
  },
  {
    id: "sandbox-isolation",
    index: "03",
    title: "Hardened Cgroup & Kernel Lockdown",
    subtitle: "Read-Only Rootfs · Cap-Drop ALL",
    command: "docker run --rm -i -t --network none --cpus 1 --memory 128m --pids-limit 64 --read-only --cap-drop ALL",
    description:
      "The compiled binary runs under unprivileged user prayog (uid 1000). Outbound and inbound networking are disabled, Linux kernel capabilities are dropped, rootfs is mounted read-only, and PIDs are capped at 64 to block fork bombs.",
    artifactTitle: "Container Security Policy",
    artifactLines: [
      "user:          prayog (uid=1000, gid=1000)",
      "network:       none (air-gapped)",
      "cgroups:       1.0 CPU · 128 MB RAM · 64 PIDs",
      "filesystem:    --read-only + 64 MB tmpfs (/tmp)",
      "capabilities:  --cap-drop ALL · no-new-privileges"
    ],
    securityBoundary: "128 MB RAM · 64 PIDs · Air-Gapped Network"
  },
  {
    id: "pty-stream",
    index: "04",
    title: "Real-Time Interactive PTY Multiplexing",
    subtitle: "node-pty ↔ WebSocket ↔ xterm.js",
    command: "pty.spawn('docker', runArgs, { name: 'xterm-color', cols: 80, rows: 24 })",
    description:
      "A genuine pseudo-terminal session streams bidirectional stdin and stdout over WebSockets. Focus-reporting escape sequences are scrubbed, 1 MB output flood protection is enforced, and the 60s execution timer resets on every keystroke.",
    artifactTitle: "Live Terminal Telemetry",
    artifactLines: [
      "stdin  -> { type: \"input\", data: \"42 58\\r\" }",
      "stdout <- \"Enter two numbers: 42 58\\r\\n\"",
      "stdout <- \"Sum = 100\\r\\n\"",
      "exit   <- { type: \"exit\", code: 0 }"
    ],
    securityBoundary: "60s Idle Timeout · 1 MB Stdout Flood Guard"
  }
];

export const FEATURE_SPECS: FeatureSpec[] = [
  {
    id: "monaco-intelligence",
    index: "01",
    title: "Monaco C17 Code Editor",
    kicker: "Editor Engine",
    description:
      "Built on the core editing engine of VS Code with native C syntax highlighting, bracket pair colorization, smooth cursor physics, and instant Ctrl+Enter execution triggers.",
    specLine: "VS Dark Theme · JetBrains Mono · Ctrl+Enter Shortcut",
    span: "wide",
    codeHighlight: "#include <stdio.h>\nint main(void) { return 0; }"
  },
  {
    id: "interactive-pty",
    index: "02",
    title: "True Interactive PTY Terminal",
    kicker: "Bidirectional I/O",
    description:
      "Unlike batch stdin boxes that require pre-typing input before execution, PrayogCode attaches an xterm.js terminal to a live node-pty pseudo-terminal so scanf(), getchar(), and fgets() pause and respond in real time.",
    specLine: "xterm.js 6.0 · FitAddon · Unbuffered init.h",
    span: "normal",
    codeHighlight: "scanf(\"%d %d\", &a, &b); // Live prompt"
  },
  {
    id: "docker-sandbox",
    index: "03",
    title: "Hardened Alpine Linux Sandbox",
    kicker: "Container Isolation",
    description:
      "Every compilation and run spawns an isolated Alpine 3.20 container with dropped Linux capabilities, read-only rootfs, disabled network interfaces, and strict cgroup memory/PID ceilings.",
    specLine: "Alpine 3.20 · --cap-drop ALL · 64 PIDs Max",
    span: "normal",
    codeHighlight: "--network none --read-only --memory 128m"
  },
  {
    id: "deterministic-lifecycle",
    index: "04",
    title: "Deterministic Resource & Lifecycle Guards",
    kicker: "Execution Reliability",
    description:
      "Automatic container cleanup (docker rm -f) on tab close or user stop, 1 MB stdout flood protection against infinite loops, and automatic idle WebSocket reconnection when resuming browser tabs.",
    specLine: "1 MB Output Cap · 60s Watchdog · Auto-Reconnect",
    span: "wide",
    codeHighlight: "Process exited with code 0"
  }
];

export function getSnippetById(id: string): CodeSnippet {
  return CURATED_C_SNIPPETS.find((s) => s.id === id) || CURATED_C_SNIPPETS[0];
}

export function getStageById(id: string): CompilationStage {
  return COMPILATION_STAGES.find((s) => s.id === id) || COMPILATION_STAGES[0];
}

export function calculateTiltTransform(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number; width: number; height: number },
  maxDegrees = 6
): { rotateX: number; rotateY: number; spotX: number; spotY: number } {
  if (rect.width <= 0 || rect.height <= 0) {
    return { rotateX: 0, rotateY: 0, spotX: 50, spotY: 50 };
  }
  const relX = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  const relY = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));

  const rotateY = Number(((relX - 0.5) * 2 * maxDegrees).toFixed(2));
  const rotateX = Number(((0.5 - relY) * 2 * maxDegrees).toFixed(2));

  return {
    rotateX,
    rotateY,
    spotX: Math.round(relX * 100),
    spotY: Math.round(relY * 100)
  };
}
