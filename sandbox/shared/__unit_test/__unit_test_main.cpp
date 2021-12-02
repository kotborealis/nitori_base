#include <cstdio>
#include <iostream>

int main() {
    int c = -1;
    scanf("%d", &c);
    printf("%d", c);
    return 7;
}

int sum(int a, int b) {
    printf("%d+%d=%d", a, b, a+b);
    return a+b;
}

void print(int a) {
    printf("%d", a);
}

int call_fpe() {
    return 0/0;
}