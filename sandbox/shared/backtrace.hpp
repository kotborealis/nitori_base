#include <stdio.h>
#include <signal.h>
#include <execinfo.h>
#include <stdlib.h>

#include <ucontext.h>
#include <string.h>

#define _PC gregs[REG_RSP]
#define _SP gregs[REG_RIP]

char *__exec_name;

static void addr2line(void *messageP) {
  char syscom[256];
  char message[4096];
  strcpy(message, (char *) messageP);
  char *saveP = NULL, *token = strtok_r(message, "+", &saveP);
  if(token) {
    token = strtok_r(NULL, "+", &saveP);
    if(token) {
      char *term = strchr(token,')');
      if(term)
        *term = 0;
    }
  }
  if(token==NULL) {
    token = message;
  }
  sprintf(syscom,"addr2line %s -i -p -s -f -C -r -e %s", token, __exec_name);

  FILE *fp = popen(syscom, "r");

  if(fp == NULL) fprintf(stderr, "<addr2line failed>");

  char buf[1024];
  while(fgets(buf, sizeof(buf), fp) != NULL) fprintf(stderr, buf);

  pclose(fp);
}

void bt_sighandler(int sig, siginfo_t *psi, void *ctxarg) {

  void *trace[16];
  char **messages = (char **)NULL;
  int i, trace_size = 0;
  mcontext_t *ctxP = &((ucontext_t *) ctxarg)->uc_mcontext;

  if (sig == SIGSEGV)
    fprintf(stderr, "Got signal %d, faulty address is %p, "
           "from %p\n", sig, (void *) ctxP->_PC, (void *) ctxP->_SP);
  else
    fprintf(stderr, "Got signal %d\n", sig);

  trace_size = backtrace(trace, 16);
  /* overwrite sigaction with caller's address */
  trace[1] = (void *)ctxP->_SP;

  messages = backtrace_symbols(trace, trace_size);
  /* skip first stack frame (points here) */
  fprintf(stderr, "Backtrace:\n");
  for (i=1; i<trace_size; ++i)
  {
    fprintf(stderr, "%d.", i);
    addr2line(messages[i]);
    fprintf(stderr, "(%s)\n\n", messages[i]);
  }

  exit(1);
}