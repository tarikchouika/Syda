var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// ../../../../.npm/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/_internal/utils.mjs
// @__NO_SIDE_EFFECTS__
function createNotImplementedError(name) {
  return new Error(`[unenv] ${name} is not implemented yet!`);
}
__name(createNotImplementedError, "createNotImplementedError");
// @__NO_SIDE_EFFECTS__
function notImplemented(name) {
  const fn = /* @__PURE__ */ __name(() => {
    throw /* @__PURE__ */ createNotImplementedError(name);
  }, "fn");
  return Object.assign(fn, { __unenv__: true });
}
__name(notImplemented, "notImplemented");
// @__NO_SIDE_EFFECTS__
function notImplementedClass(name) {
  return class {
    __unenv__ = true;
    constructor() {
      throw new Error(`[unenv] ${name} is not implemented yet!`);
    }
  };
}
__name(notImplementedClass, "notImplementedClass");

// ../../../../.npm/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/internal/perf_hooks/performance.mjs
var _timeOrigin = globalThis.performance?.timeOrigin ?? Date.now();
var _performanceNow = globalThis.performance?.now ? globalThis.performance.now.bind(globalThis.performance) : () => Date.now() - _timeOrigin;
var nodeTiming = {
  name: "node",
  entryType: "node",
  startTime: 0,
  duration: 0,
  nodeStart: 0,
  v8Start: 0,
  bootstrapComplete: 0,
  environment: 0,
  loopStart: 0,
  loopExit: 0,
  idleTime: 0,
  uvMetricsInfo: {
    loopCount: 0,
    events: 0,
    eventsWaiting: 0
  },
  detail: void 0,
  toJSON() {
    return this;
  }
};
var PerformanceEntry = class {
  static {
    __name(this, "PerformanceEntry");
  }
  __unenv__ = true;
  detail;
  entryType = "event";
  name;
  startTime;
  constructor(name, options) {
    this.name = name;
    this.startTime = options?.startTime || _performanceNow();
    this.detail = options?.detail;
  }
  get duration() {
    return _performanceNow() - this.startTime;
  }
  toJSON() {
    return {
      name: this.name,
      entryType: this.entryType,
      startTime: this.startTime,
      duration: this.duration,
      detail: this.detail
    };
  }
};
var PerformanceMark = class PerformanceMark2 extends PerformanceEntry {
  static {
    __name(this, "PerformanceMark");
  }
  entryType = "mark";
  constructor() {
    super(...arguments);
  }
  get duration() {
    return 0;
  }
};
var PerformanceMeasure = class extends PerformanceEntry {
  static {
    __name(this, "PerformanceMeasure");
  }
  entryType = "measure";
};
var PerformanceResourceTiming = class extends PerformanceEntry {
  static {
    __name(this, "PerformanceResourceTiming");
  }
  entryType = "resource";
  serverTiming = [];
  connectEnd = 0;
  connectStart = 0;
  decodedBodySize = 0;
  domainLookupEnd = 0;
  domainLookupStart = 0;
  encodedBodySize = 0;
  fetchStart = 0;
  initiatorType = "";
  name = "";
  nextHopProtocol = "";
  redirectEnd = 0;
  redirectStart = 0;
  requestStart = 0;
  responseEnd = 0;
  responseStart = 0;
  secureConnectionStart = 0;
  startTime = 0;
  transferSize = 0;
  workerStart = 0;
  responseStatus = 0;
};
var PerformanceObserverEntryList = class {
  static {
    __name(this, "PerformanceObserverEntryList");
  }
  __unenv__ = true;
  getEntries() {
    return [];
  }
  getEntriesByName(_name, _type) {
    return [];
  }
  getEntriesByType(type) {
    return [];
  }
};
var Performance = class {
  static {
    __name(this, "Performance");
  }
  __unenv__ = true;
  timeOrigin = _timeOrigin;
  eventCounts = /* @__PURE__ */ new Map();
  _entries = [];
  _resourceTimingBufferSize = 0;
  navigation = void 0;
  timing = void 0;
  timerify(_fn, _options) {
    throw createNotImplementedError("Performance.timerify");
  }
  get nodeTiming() {
    return nodeTiming;
  }
  eventLoopUtilization() {
    return {};
  }
  markResourceTiming() {
    return new PerformanceResourceTiming("");
  }
  onresourcetimingbufferfull = null;
  now() {
    if (this.timeOrigin === _timeOrigin) {
      return _performanceNow();
    }
    return Date.now() - this.timeOrigin;
  }
  clearMarks(markName) {
    this._entries = markName ? this._entries.filter((e) => e.name !== markName) : this._entries.filter((e) => e.entryType !== "mark");
  }
  clearMeasures(measureName) {
    this._entries = measureName ? this._entries.filter((e) => e.name !== measureName) : this._entries.filter((e) => e.entryType !== "measure");
  }
  clearResourceTimings() {
    this._entries = this._entries.filter((e) => e.entryType !== "resource" || e.entryType !== "navigation");
  }
  getEntries() {
    return this._entries;
  }
  getEntriesByName(name, type) {
    return this._entries.filter((e) => e.name === name && (!type || e.entryType === type));
  }
  getEntriesByType(type) {
    return this._entries.filter((e) => e.entryType === type);
  }
  mark(name, options) {
    const entry = new PerformanceMark(name, options);
    this._entries.push(entry);
    return entry;
  }
  measure(measureName, startOrMeasureOptions, endMark) {
    let start2;
    let end2;
    if (typeof startOrMeasureOptions === "string") {
      start2 = this.getEntriesByName(startOrMeasureOptions, "mark")[0]?.startTime;
      end2 = this.getEntriesByName(endMark, "mark")[0]?.startTime;
    } else {
      start2 = Number.parseFloat(startOrMeasureOptions?.start) || this.now();
      end2 = Number.parseFloat(startOrMeasureOptions?.end) || this.now();
    }
    const entry = new PerformanceMeasure(measureName, {
      startTime: start2,
      detail: {
        start: start2,
        end: end2
      }
    });
    this._entries.push(entry);
    return entry;
  }
  setResourceTimingBufferSize(maxSize) {
    this._resourceTimingBufferSize = maxSize;
  }
  addEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.addEventListener");
  }
  removeEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.removeEventListener");
  }
  dispatchEvent(event) {
    throw createNotImplementedError("Performance.dispatchEvent");
  }
  toJSON() {
    return this;
  }
};
var PerformanceObserver = class {
  static {
    __name(this, "PerformanceObserver");
  }
  __unenv__ = true;
  static supportedEntryTypes = [];
  _callback = null;
  constructor(callback) {
    this._callback = callback;
  }
  takeRecords() {
    return [];
  }
  disconnect() {
    throw createNotImplementedError("PerformanceObserver.disconnect");
  }
  observe(options) {
    throw createNotImplementedError("PerformanceObserver.observe");
  }
  bind(fn) {
    return fn;
  }
  runInAsyncScope(fn, thisArg, ...args) {
    return fn.call(thisArg, ...args);
  }
  asyncId() {
    return 0;
  }
  triggerAsyncId() {
    return 0;
  }
  emitDestroy() {
    return this;
  }
};
var performance = globalThis.performance && "addEventListener" in globalThis.performance ? globalThis.performance : new Performance();

// ../../../../.npm/_npx/32026684e21afda6/node_modules/@cloudflare/unenv-preset/dist/runtime/polyfill/performance.mjs
if (!("__unenv__" in performance)) {
  const proto = Performance.prototype;
  for (const key of Object.getOwnPropertyNames(proto)) {
    if (key !== "constructor" && !(key in performance)) {
      const desc = Object.getOwnPropertyDescriptor(proto, key);
      if (desc) {
        Object.defineProperty(performance, key, desc);
      }
    }
  }
}
globalThis.performance = performance;
globalThis.Performance = Performance;
globalThis.PerformanceEntry = PerformanceEntry;
globalThis.PerformanceMark = PerformanceMark;
globalThis.PerformanceMeasure = PerformanceMeasure;
globalThis.PerformanceObserver = PerformanceObserver;
globalThis.PerformanceObserverEntryList = PerformanceObserverEntryList;
globalThis.PerformanceResourceTiming = PerformanceResourceTiming;

// ../../../../.npm/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/console.mjs
import { Writable } from "node:stream";

// ../../../../.npm/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/mock/noop.mjs
var noop_default = Object.assign(() => {
}, { __unenv__: true });

// ../../../../.npm/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/console.mjs
var _console = globalThis.console;
var _ignoreErrors = true;
var _stderr = new Writable();
var _stdout = new Writable();
var log = _console?.log ?? noop_default;
var info = _console?.info ?? log;
var trace = _console?.trace ?? info;
var debug = _console?.debug ?? log;
var table = _console?.table ?? log;
var error = _console?.error ?? log;
var warn = _console?.warn ?? error;
var createTask = _console?.createTask ?? /* @__PURE__ */ notImplemented("console.createTask");
var clear = _console?.clear ?? noop_default;
var count = _console?.count ?? noop_default;
var countReset = _console?.countReset ?? noop_default;
var dir = _console?.dir ?? noop_default;
var dirxml = _console?.dirxml ?? noop_default;
var group = _console?.group ?? noop_default;
var groupEnd = _console?.groupEnd ?? noop_default;
var groupCollapsed = _console?.groupCollapsed ?? noop_default;
var profile = _console?.profile ?? noop_default;
var profileEnd = _console?.profileEnd ?? noop_default;
var time = _console?.time ?? noop_default;
var timeEnd = _console?.timeEnd ?? noop_default;
var timeLog = _console?.timeLog ?? noop_default;
var timeStamp = _console?.timeStamp ?? noop_default;
var Console = _console?.Console ?? /* @__PURE__ */ notImplementedClass("console.Console");
var _times = /* @__PURE__ */ new Map();
var _stdoutErrorHandler = noop_default;
var _stderrErrorHandler = noop_default;

// ../../../../.npm/_npx/32026684e21afda6/node_modules/@cloudflare/unenv-preset/dist/runtime/node/console.mjs
var workerdConsole = globalThis["console"];
var {
  assert,
  clear: clear2,
  // @ts-expect-error undocumented public API
  context,
  count: count2,
  countReset: countReset2,
  // @ts-expect-error undocumented public API
  createTask: createTask2,
  debug: debug2,
  dir: dir2,
  dirxml: dirxml2,
  error: error2,
  group: group2,
  groupCollapsed: groupCollapsed2,
  groupEnd: groupEnd2,
  info: info2,
  log: log2,
  profile: profile2,
  profileEnd: profileEnd2,
  table: table2,
  time: time2,
  timeEnd: timeEnd2,
  timeLog: timeLog2,
  timeStamp: timeStamp2,
  trace: trace2,
  warn: warn2
} = workerdConsole;
Object.assign(workerdConsole, {
  Console,
  _ignoreErrors,
  _stderr,
  _stderrErrorHandler,
  _stdout,
  _stdoutErrorHandler,
  _times
});
var console_default = workerdConsole;

// ../../../../.npm/_npx/32026684e21afda6/node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-console
globalThis.console = console_default;

// ../../../../.npm/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/internal/process/hrtime.mjs
var hrtime = /* @__PURE__ */ Object.assign(/* @__PURE__ */ __name(function hrtime2(startTime) {
  const now = Date.now();
  const seconds = Math.trunc(now / 1e3);
  const nanos = now % 1e3 * 1e6;
  if (startTime) {
    let diffSeconds = seconds - startTime[0];
    let diffNanos = nanos - startTime[0];
    if (diffNanos < 0) {
      diffSeconds = diffSeconds - 1;
      diffNanos = 1e9 + diffNanos;
    }
    return [diffSeconds, diffNanos];
  }
  return [seconds, nanos];
}, "hrtime"), { bigint: /* @__PURE__ */ __name(function bigint() {
  return BigInt(Date.now() * 1e6);
}, "bigint") });

// ../../../../.npm/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/internal/process/process.mjs
import { EventEmitter } from "node:events";

// ../../../../.npm/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/internal/tty/read-stream.mjs
var ReadStream = class {
  static {
    __name(this, "ReadStream");
  }
  fd;
  isRaw = false;
  isTTY = false;
  constructor(fd) {
    this.fd = fd;
  }
  setRawMode(mode) {
    this.isRaw = mode;
    return this;
  }
};

// ../../../../.npm/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/internal/tty/write-stream.mjs
var WriteStream = class {
  static {
    __name(this, "WriteStream");
  }
  fd;
  columns = 80;
  rows = 24;
  isTTY = false;
  constructor(fd) {
    this.fd = fd;
  }
  clearLine(dir3, callback) {
    callback && callback();
    return false;
  }
  clearScreenDown(callback) {
    callback && callback();
    return false;
  }
  cursorTo(x, y, callback) {
    callback && typeof callback === "function" && callback();
    return false;
  }
  moveCursor(dx, dy, callback) {
    callback && callback();
    return false;
  }
  getColorDepth(env2) {
    return 1;
  }
  hasColors(count3, env2) {
    return false;
  }
  getWindowSize() {
    return [this.columns, this.rows];
  }
  write(str, encoding, cb) {
    if (str instanceof Uint8Array) {
      str = new TextDecoder().decode(str);
    }
    try {
      console.log(str);
    } catch {
    }
    cb && typeof cb === "function" && cb();
    return false;
  }
};

// ../../../../.npm/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/internal/process/node-version.mjs
var NODE_VERSION = "22.14.0";

// ../../../../.npm/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/internal/process/process.mjs
var Process = class _Process extends EventEmitter {
  static {
    __name(this, "Process");
  }
  env;
  hrtime;
  nextTick;
  constructor(impl) {
    super();
    this.env = impl.env;
    this.hrtime = impl.hrtime;
    this.nextTick = impl.nextTick;
    for (const prop of [...Object.getOwnPropertyNames(_Process.prototype), ...Object.getOwnPropertyNames(EventEmitter.prototype)]) {
      const value = this[prop];
      if (typeof value === "function") {
        this[prop] = value.bind(this);
      }
    }
  }
  // --- event emitter ---
  emitWarning(warning, type, code) {
    console.warn(`${code ? `[${code}] ` : ""}${type ? `${type}: ` : ""}${warning}`);
  }
  emit(...args) {
    return super.emit(...args);
  }
  listeners(eventName) {
    return super.listeners(eventName);
  }
  // --- stdio (lazy initializers) ---
  #stdin;
  #stdout;
  #stderr;
  get stdin() {
    return this.#stdin ??= new ReadStream(0);
  }
  get stdout() {
    return this.#stdout ??= new WriteStream(1);
  }
  get stderr() {
    return this.#stderr ??= new WriteStream(2);
  }
  // --- cwd ---
  #cwd = "/";
  chdir(cwd2) {
    this.#cwd = cwd2;
  }
  cwd() {
    return this.#cwd;
  }
  // --- dummy props and getters ---
  arch = "";
  platform = "";
  argv = [];
  argv0 = "";
  execArgv = [];
  execPath = "";
  title = "";
  pid = 200;
  ppid = 100;
  get version() {
    return `v${NODE_VERSION}`;
  }
  get versions() {
    return { node: NODE_VERSION };
  }
  get allowedNodeEnvironmentFlags() {
    return /* @__PURE__ */ new Set();
  }
  get sourceMapsEnabled() {
    return false;
  }
  get debugPort() {
    return 0;
  }
  get throwDeprecation() {
    return false;
  }
  get traceDeprecation() {
    return false;
  }
  get features() {
    return {};
  }
  get release() {
    return {};
  }
  get connected() {
    return false;
  }
  get config() {
    return {};
  }
  get moduleLoadList() {
    return [];
  }
  constrainedMemory() {
    return 0;
  }
  availableMemory() {
    return 0;
  }
  uptime() {
    return 0;
  }
  resourceUsage() {
    return {};
  }
  // --- noop methods ---
  ref() {
  }
  unref() {
  }
  // --- unimplemented methods ---
  umask() {
    throw createNotImplementedError("process.umask");
  }
  getBuiltinModule() {
    return void 0;
  }
  getActiveResourcesInfo() {
    throw createNotImplementedError("process.getActiveResourcesInfo");
  }
  exit() {
    throw createNotImplementedError("process.exit");
  }
  reallyExit() {
    throw createNotImplementedError("process.reallyExit");
  }
  kill() {
    throw createNotImplementedError("process.kill");
  }
  abort() {
    throw createNotImplementedError("process.abort");
  }
  dlopen() {
    throw createNotImplementedError("process.dlopen");
  }
  setSourceMapsEnabled() {
    throw createNotImplementedError("process.setSourceMapsEnabled");
  }
  loadEnvFile() {
    throw createNotImplementedError("process.loadEnvFile");
  }
  disconnect() {
    throw createNotImplementedError("process.disconnect");
  }
  cpuUsage() {
    throw createNotImplementedError("process.cpuUsage");
  }
  setUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.setUncaughtExceptionCaptureCallback");
  }
  hasUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.hasUncaughtExceptionCaptureCallback");
  }
  initgroups() {
    throw createNotImplementedError("process.initgroups");
  }
  openStdin() {
    throw createNotImplementedError("process.openStdin");
  }
  assert() {
    throw createNotImplementedError("process.assert");
  }
  binding() {
    throw createNotImplementedError("process.binding");
  }
  // --- attached interfaces ---
  permission = { has: /* @__PURE__ */ notImplemented("process.permission.has") };
  report = {
    directory: "",
    filename: "",
    signal: "SIGUSR2",
    compact: false,
    reportOnFatalError: false,
    reportOnSignal: false,
    reportOnUncaughtException: false,
    getReport: /* @__PURE__ */ notImplemented("process.report.getReport"),
    writeReport: /* @__PURE__ */ notImplemented("process.report.writeReport")
  };
  finalization = {
    register: /* @__PURE__ */ notImplemented("process.finalization.register"),
    unregister: /* @__PURE__ */ notImplemented("process.finalization.unregister"),
    registerBeforeExit: /* @__PURE__ */ notImplemented("process.finalization.registerBeforeExit")
  };
  memoryUsage = Object.assign(() => ({
    arrayBuffers: 0,
    rss: 0,
    external: 0,
    heapTotal: 0,
    heapUsed: 0
  }), { rss: /* @__PURE__ */ __name(() => 0, "rss") });
  // --- undefined props ---
  mainModule = void 0;
  domain = void 0;
  // optional
  send = void 0;
  exitCode = void 0;
  channel = void 0;
  getegid = void 0;
  geteuid = void 0;
  getgid = void 0;
  getgroups = void 0;
  getuid = void 0;
  setegid = void 0;
  seteuid = void 0;
  setgid = void 0;
  setgroups = void 0;
  setuid = void 0;
  // internals
  _events = void 0;
  _eventsCount = void 0;
  _exiting = void 0;
  _maxListeners = void 0;
  _debugEnd = void 0;
  _debugProcess = void 0;
  _fatalException = void 0;
  _getActiveHandles = void 0;
  _getActiveRequests = void 0;
  _kill = void 0;
  _preload_modules = void 0;
  _rawDebug = void 0;
  _startProfilerIdleNotifier = void 0;
  _stopProfilerIdleNotifier = void 0;
  _tickCallback = void 0;
  _disconnect = void 0;
  _handleQueue = void 0;
  _pendingMessage = void 0;
  _channel = void 0;
  _send = void 0;
  _linkedBinding = void 0;
};

// ../../../../.npm/_npx/32026684e21afda6/node_modules/@cloudflare/unenv-preset/dist/runtime/node/process.mjs
var globalProcess = globalThis["process"];
var getBuiltinModule = globalProcess.getBuiltinModule;
var workerdProcess = getBuiltinModule("node:process");
var unenvProcess = new Process({
  env: globalProcess.env,
  hrtime,
  // `nextTick` is available from workerd process v1
  nextTick: workerdProcess.nextTick
});
var { exit, features, platform } = workerdProcess;
var {
  _channel,
  _debugEnd,
  _debugProcess,
  _disconnect,
  _events,
  _eventsCount,
  _exiting,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _handleQueue,
  _kill,
  _linkedBinding,
  _maxListeners,
  _pendingMessage,
  _preload_modules,
  _rawDebug,
  _send,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  arch,
  argv,
  argv0,
  assert: assert2,
  availableMemory,
  binding,
  channel,
  chdir,
  config,
  connected,
  constrainedMemory,
  cpuUsage,
  cwd,
  debugPort,
  disconnect,
  dlopen,
  domain,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  exitCode,
  finalization,
  getActiveResourcesInfo,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getMaxListeners,
  getuid,
  hasUncaughtExceptionCaptureCallback,
  hrtime: hrtime3,
  initgroups,
  kill,
  listenerCount,
  listeners,
  loadEnvFile,
  mainModule,
  memoryUsage,
  moduleLoadList,
  nextTick,
  off,
  on,
  once,
  openStdin,
  permission,
  pid,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  reallyExit,
  ref,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  send,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setMaxListeners,
  setSourceMapsEnabled,
  setuid,
  setUncaughtExceptionCaptureCallback,
  sourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  throwDeprecation,
  title,
  traceDeprecation,
  umask,
  unref,
  uptime,
  version,
  versions
} = unenvProcess;
var _process = {
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  hasUncaughtExceptionCaptureCallback,
  setUncaughtExceptionCaptureCallback,
  loadEnvFile,
  sourceMapsEnabled,
  arch,
  argv,
  argv0,
  chdir,
  config,
  connected,
  constrainedMemory,
  availableMemory,
  cpuUsage,
  cwd,
  debugPort,
  dlopen,
  disconnect,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  exit,
  finalization,
  features,
  getBuiltinModule,
  getActiveResourcesInfo,
  getMaxListeners,
  hrtime: hrtime3,
  kill,
  listeners,
  listenerCount,
  memoryUsage,
  nextTick,
  on,
  off,
  once,
  pid,
  platform,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  setMaxListeners,
  setSourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  title,
  throwDeprecation,
  traceDeprecation,
  umask,
  uptime,
  version,
  versions,
  // @ts-expect-error old API
  domain,
  initgroups,
  moduleLoadList,
  reallyExit,
  openStdin,
  assert: assert2,
  binding,
  send,
  exitCode,
  channel,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getuid,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setuid,
  permission,
  mainModule,
  _events,
  _eventsCount,
  _exiting,
  _maxListeners,
  _debugEnd,
  _debugProcess,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _kill,
  _preload_modules,
  _rawDebug,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  _disconnect,
  _handleQueue,
  _pendingMessage,
  _channel,
  _send,
  _linkedBinding
};
var process_default = _process;

// ../../../../.npm/_npx/32026684e21afda6/node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-process
globalThis.process = process_default;

// api/support-lib.js
var SUPERADMIN_SEED = "5700612979";
var MSG_CAP = 200;
var MSG_MAX_LEN = 1e3;
var SESSION_TTL = 7 * 24 * 60 * 60;
var SID_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
var SID_LEN = 5;
var ROLE_AR = { superadmin: "\u0633\u0648\u0628\u0631 \u0623\u062F\u0645\u064A\u0646", admin: "\u0623\u062F\u0645\u0646", coadmin: "\u0643\u0648\u0623\u062F\u0645\u064A\u0646", none: "\u0628\u062F\u0648\u0646 \u0635\u0644\u0627\u062D\u064A\u0629" };
function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" }
  });
}
__name(json, "json");
function escHtml(s) {
  return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
__name(escHtml, "escHtml");
function validK(k) {
  return typeof k === "string" && /^[a-f0-9][a-f0-9-]{7,63}$/i.test(k);
}
__name(validK, "validK");
var rateBuckets = /* @__PURE__ */ new Map();
function rateLimited(id, limit, windowSec) {
  const now = Date.now() / 1e3;
  let arr = rateBuckets.get(id) || [];
  arr = arr.filter((t) => now - t < windowSec);
  if (arr.length >= limit) {
    rateBuckets.set(id, arr);
    return true;
  }
  arr.push(now);
  rateBuckets.set(id, arr);
  if (rateBuckets.size > 5e3) rateBuckets.clear();
  return false;
}
__name(rateLimited, "rateLimited");
async function kvGet(KV, key) {
  if (!KV) return null;
  try {
    return await KV.get(key, "json") ?? null;
  } catch (e) {
    return null;
  }
}
__name(kvGet, "kvGet");
async function kvPut(KV, key, value, ttl) {
  if (!KV) return;
  const opts = ttl && ttl > 60 ? { expirationTtl: ttl } : void 0;
  await KV.put(key, JSON.stringify(value), opts);
}
__name(kvPut, "kvPut");
async function getRoles(KV) {
  const cfg = await kvGet(KV, "cfg:roles") || {};
  return {
    superadmins: new Set(cfg.superadmins != null ? cfg.superadmins : [SUPERADMIN_SEED]),
    admins: new Set(cfg.admins || []),
    coadmins: new Set(cfg.coadmins || [])
  };
}
__name(getRoles, "getRoles");
async function putRoles(KV, roles) {
  await kvPut(KV, "cfg:roles", {
    superadmins: [...roles.superadmins],
    admins: [...roles.admins],
    coadmins: [...roles.coadmins]
  });
}
__name(putRoles, "putRoles");
async function roleOf(KV, tgId) {
  const id = String(tgId);
  const roles = await getRoles(KV);
  if (roles.superadmins.has(id)) return "superadmin";
  if (roles.admins.has(id)) return "admin";
  if (roles.coadmins.has(id)) return "coadmin";
  return "none";
}
__name(roleOf, "roleOf");
async function getSession(KV, k) {
  if (!validK(k)) return null;
  return await kvGet(KV, "sess:" + k);
}
__name(getSession, "getSession");
async function putSession(KV, sess) {
  await kvPut(KV, "sess:" + sess.k, sess, SESSION_TTL);
}
__name(putSession, "putSession");
async function newSid(KV) {
  const keys = await getOpenKeys(KV);
  const open = await Promise.all(keys.slice(-100).map((k) => kvGet(KV, "sess:" + k)));
  const taken = new Set(open.filter(Boolean).map((s) => s.sid));
  for (let i = 0; i < 8; i++) {
    let sid = "";
    const bytes = new Uint8Array(SID_LEN);
    crypto.getRandomValues(bytes);
    for (let b of bytes) sid += SID_ALPHABET[b % SID_ALPHABET.length];
    if (!taken.has(sid)) return sid;
  }
  return Date.now().toString(36).toUpperCase();
}
__name(newSid, "newSid");
async function getOpenKeys(KV) {
  const idx = await kvGet(KV, "idx:open");
  return idx && Array.isArray(idx.open) ? idx.open : [];
}
__name(getOpenKeys, "getOpenKeys");
async function addToOpen(KV, k) {
  const keys = await getOpenKeys(KV);
  if (!keys.includes(k)) await kvPut(KV, "idx:open", { open: [...keys, k].slice(-500) });
}
__name(addToOpen, "addToOpen");
async function removeFromOpen(KV, k) {
  const keys = await getOpenKeys(KV);
  if (keys.includes(k)) await kvPut(KV, "idx:open", { open: keys.filter((x) => x !== k) });
}
__name(removeFromOpen, "removeFromOpen");
async function loadMsgs(KV, k) {
  const m = await kvGet(KV, "msgs:" + k);
  return m && Array.isArray(m.list) ? m : { list: [] };
}
__name(loadMsgs, "loadMsgs");
async function saveMsgs(KV, k, msgs) {
  if (msgs.list.length > MSG_CAP) msgs.list = msgs.list.slice(-MSG_CAP);
  await kvPut(KV, "msgs:" + k, msgs, SESSION_TTL);
}
__name(saveMsgs, "saveMsgs");
async function pushMsg(KV, k, from, text, extra) {
  const sess = await getSession(KV, k);
  if (!sess) return null;
  const seq = (sess.seq || 0) + 1;
  const msg2 = {
    seq,
    from,
    // visitor | staff | sys
    text: String(text || "").slice(0, MSG_MAX_LEN),
    name: extra && extra.name ? String(extra.name).slice(0, 60) : null,
    code: extra && extra.code ? String(extra.code).slice(0, 20) : null,
    ts: Date.now()
  };
  sess.seq = seq;
  sess.updatedAt = msg2.ts;
  await putSession(KV, sess);
  const msgs = await loadMsgs(KV, k);
  msgs.list.push(msg2);
  await saveMsgs(KV, k, msgs);
  return msg2;
}
__name(pushMsg, "pushMsg");
async function getStaff(KV, tgId) {
  const s = await kvGet(KV, "staff:" + tgId);
  return s || { cur: null, name: null, lastSeen: 0 };
}
__name(getStaff, "getStaff");
async function putStaff(KV, tgId, staff) {
  await kvPut(KV, "staff:" + tgId, staff, 90 * 24 * 60 * 60);
}
__name(putStaff, "putStaff");
function tgBase(env2) {
  return env2 && env2.TG_API_BASE || "https://api.telegram.org";
}
__name(tgBase, "tgBase");
async function tgCall(env2, method, payload) {
  const token = env2 && env2.TG_BOT_TOKEN;
  if (!token) return null;
  try {
    const res = await fetch(tgBase(env2) + "/bot" + token + "/" + method, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return await res.json().catch(() => null);
  } catch (e) {
    return null;
  }
}
__name(tgCall, "tgCall");
async function tgSend(env2, chatId, html, opts) {
  if (!chatId) return null;
  return await tgCall(env2, "sendMessage", {
    chat_id: chatId,
    text: String(html).slice(0, 4e3),
    parse_mode: "HTML",
    disable_web_page_preview: true,
    ...opts || {}
  });
}
__name(tgSend, "tgSend");
async function tgAnswerCallback(env2, callbackId, text) {
  if (!callbackId) return null;
  return await tgCall(env2, "answerCallbackQuery", { callback_query_id: callbackId, text: text || "" });
}
__name(tgAnswerCallback, "tgAnswerCallback");
async function allStaffIds(KV) {
  const roles = await getRoles(KV);
  return {
    superadmins: [...roles.superadmins],
    admins: [...roles.admins],
    coadmins: [...roles.coadmins]
  };
}
__name(allStaffIds, "allStaffIds");
function sessLabel(sess) {
  const lang = sess.lang === "en" ? "EN" : "\u0639";
  return `#${escHtml(sess.sid)}`;
}
__name(sessLabel, "sessLabel");
async function notifyNewConversation(env2, KV, sess, firstText) {
  const staff = await allStaffIds(KV);
  const ids = [.../* @__PURE__ */ new Set([...staff.superadmins, ...staff.admins, ...staff.coadmins])];
  const text = `\u{1F4AC} <b>\u0645\u062D\u0627\u062F\u062B\u0629 \u0632\u0627\u0626\u0631 \u062C\u062F\u064A\u062F\u0629</b> ${sessLabel(sess)}
\u{1F310} \u0627\u0644\u0644\u063A\u0629: ${sess.lang === "en" ? "English" : "\u0627\u0644\u0639\u0631\u0628\u064A\u0629"}
` + (sess.page ? `\u{1F517} \u0627\u0644\u0635\u0641\u062D\u0629: ${escHtml(shortUrl(sess.page))}
` : "") + (firstText ? `\u{1F464} \u0627\u0644\u0631\u0633\u0627\u0644\u0629: ${escHtml(firstText.slice(0, 200))}
` : "") + `
\u0644\u0644\u0631\u062F \u0623\u0631\u0633\u0644: <code>/open ${escHtml(sess.sid)}</code>`;
  const keyboard = { inline_keyboard: [[{ text: "\u{1F441} \u0641\u062A\u062D \u0627\u0644\u0645\u062D\u0627\u062F\u062B\u0629", callback_data: "open:" + sess.sid }]] };
  const jobs = ids.map((id) => tgSend(env2, id, text, { reply_markup: keyboard }));
  await Promise.all(jobs);
}
__name(notifyNewConversation, "notifyNewConversation");
function shortUrl(url) {
  try {
    const u = new URL(url);
    return u.host + (u.pathname.length > 34 ? u.pathname.slice(0, 34) + "\u2026" : u.pathname);
  } catch (e) {
    return String(url).slice(0, 40);
  }
}
__name(shortUrl, "shortUrl");
async function notifyVisitorMessage(env2, KV, sess, text) {
  if (sess.assignee) {
    return await tgSend(
      env2,
      sess.assignee,
      `\u{1F4E8} ${sessLabel(sess)} \xB7 ${escHtml(sess.assigneeName || "\u0648\u0643\u064A\u0644")}:
${escHtml(text.slice(0, 500))}`
    );
  }
  const staff = await allStaffIds(KV);
  const ids = [.../* @__PURE__ */ new Set([...staff.superadmins, ...staff.admins, ...staff.coadmins])];
  const body = `\u{1F4E8} <b>\u0631\u0633\u0627\u0644\u0629 \u0632\u0627\u0626\u0631</b> ${sessLabel(sess)} (\u0628\u062F\u0648\u0646 \u0648\u0643\u064A\u0644):
${escHtml(text.slice(0, 500))}`;
  const keyboard = { inline_keyboard: [[{ text: "\u{1F441} \u0627\u0644\u0631\u062F \u0627\u0644\u0622\u0646", callback_data: "open:" + sess.sid }]] };
  await Promise.all(ids.map((id) => tgSend(env2, id, body, { reply_markup: keyboard })));
}
__name(notifyVisitorMessage, "notifyVisitorMessage");

// api/support/[route].js
var START_RATE = 10;
var MSG_RATE = 30;
var RATE_WINDOW = 5 * 60;
function originAllowed(request) {
  const origin = request.headers.get("Origin");
  if (origin) return /^https:\/\/([a-z0-9-]+\.)?syda\.pages\.dev$/i.test(origin);
  const referer = request.headers.get("Referer") || "";
  return /^https:\/\/([a-z0-9-]+\.)?syda\.pages\.dev\//i.test(referer);
}
__name(originAllowed, "originAllowed");
async function readJson(request) {
  try {
    return await request.json();
  } catch (e) {
    return null;
  }
}
__name(readJson, "readJson");
async function start(env2, waitUntil, body) {
  const k = body && body.k;
  const lang = body && body.lang === "en" ? "en" : "ar";
  const page = String(body && body.page || "").slice(0, 300);
  if (!validK(k)) return json(400, { ok: false, error: "bad_key" });
  const existing = await getSession(env2.SUPPORT_KV, k);
  if (existing && existing.status === "open") {
    existing.updatedAt = Date.now();
    await putSession(env2.SUPPORT_KV, existing);
    return json(200, {
      ok: true,
      sid: existing.sid,
      seq: existing.seq || 0,
      resumed: true,
      assigneeName: existing.assigneeName || null
    });
  }
  const sess = {
    k,
    sid: await newSid(env2.SUPPORT_KV),
    lang,
    page,
    seq: 0,
    status: "open",
    assignee: null,
    assigneeName: null,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  await putSession(env2.SUPPORT_KV, sess);
  await saveMsgs(env2.SUPPORT_KV, k, { list: [] });
  await addToOpen(env2.SUPPORT_KV, k);
  waitUntil(notifyNewConversation(env2, env2.SUPPORT_KV, sess, null));
  return json(200, { ok: true, sid: sess.sid, seq: 0, resumed: false, assigneeName: null });
}
__name(start, "start");
async function msg(env2, waitUntil, body) {
  const k = body && body.k;
  const text = String(body && body.text || "").trim();
  if (!validK(k)) return json(400, { ok: false, error: "bad_key" });
  if (!text) return json(400, { ok: false, error: "empty_message" });
  const sess = await getSession(env2.SUPPORT_KV, k);
  if (!sess || sess.status !== "open") return json(410, { ok: false, error: "closed" });
  if (rateLimited("msg:" + k, MSG_RATE, RATE_WINDOW)) {
    return json(429, { ok: false, error: "rate_limited" });
  }
  await pushMsg(env2.SUPPORT_KV, k, "visitor", text);
  waitUntil(notifyVisitorMessage(env2, env2.SUPPORT_KV, sess, text));
  return json(200, { ok: true });
}
__name(msg, "msg");
async function poll(env2, k, after) {
  const sess = await getSession(env2.SUPPORT_KV, k);
  if (!sess) return json(200, { ok: true, status: "none", msgs: [], assigneeName: null });
  const afterSeq = Math.max(0, Number(after) || 0);
  const msgs = await loadMsgs(env2.SUPPORT_KV, k);
  const pending = msgs.list.filter((m) => m.seq > afterSeq && m.from !== "visitor").slice(0, 50).map((m) => ({ seq: m.seq, from: m.from, text: m.text, name: m.name || null, code: m.code || null }));
  return json(200, {
    ok: true,
    status: sess.status === "open" ? "open" : "closed",
    msgs: pending,
    assigneeName: sess.assigneeName || null
  });
}
__name(poll, "poll");
async function end(env2, waitUntil, body) {
  const k = body && body.k;
  if (!validK(k)) return json(400, { ok: false, error: "bad_key" });
  const sess = await getSession(env2.SUPPORT_KV, k);
  if (!sess || sess.status !== "open") return json(200, { ok: true, status: "closed" });
  sess.status = "closed";
  sess.updatedAt = Date.now();
  await putSession(env2.SUPPORT_KV, sess);
  await pushMsg(env2.SUPPORT_KV, k, "sys", "", { code: "closed" });
  await removeFromOpen(env2.SUPPORT_KV, k);
  const notify = sess.assignee ? tgSend(env2, sess.assignee, `\u2705 ${sess.sid ? "#" + sess.sid : ""} \u0623\u063A\u0644\u0642 \u0627\u0644\u0632\u0627\u0626\u0631 \u0627\u0644\u0645\u062D\u0627\u062F\u062B\u0629.`) : (async () => {
    const staff = await allStaffIds(env2.SUPPORT_KV);
    const ids = [.../* @__PURE__ */ new Set([...staff.superadmins, ...staff.admins])];
    await Promise.all(ids.map((id) => tgSend(env2, id, `\u2705 #${sess.sid} \u0623\u063A\u0644\u0642 \u0627\u0644\u0632\u0627\u0626\u0631 \u0627\u0644\u0645\u062D\u0627\u062F\u062B\u0629.`)));
  })();
  waitUntil(notify);
  return json(200, { ok: true });
}
__name(end, "end");
async function onRequestPost(context2) {
  const { request, env: env2 } = context2;
  const waitUntil = /* @__PURE__ */ __name((p) => context2.waitUntil(p), "waitUntil");
  if (!originAllowed(request)) return json(403, { ok: false, error: "origin_not_allowed" });
  const url = new URL(request.url);
  const route = url.pathname.replace(/^\/api\/support\/?/, "").replace(/\/$/, "");
  const body = await readJson(request);
  if (route === "start") {
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    if (rateLimited("start:" + ip, START_RATE, RATE_WINDOW)) {
      return json(429, { ok: false, error: "rate_limited" });
    }
    return await start(env2, waitUntil, body);
  }
  if (route === "msg") return await msg(env2, waitUntil, body);
  if (route === "end") return await end(env2, waitUntil, body);
  return json(404, { ok: false, error: "not_found" });
}
__name(onRequestPost, "onRequestPost");
async function onRequestGet(context2) {
  const { request, env: env2 } = context2;
  if (!originAllowed(request)) return json(403, { ok: false, error: "origin_not_allowed" });
  const url = new URL(request.url);
  const route = url.pathname.replace(/^\/api\/support\/?/, "").replace(/\/$/, "");
  if (route === "poll") {
    return await poll(env2, url.searchParams.get("k"), url.searchParams.get("after"));
  }
  return json(404, { ok: false, error: "not_found" });
}
__name(onRequestGet, "onRequestGet");
async function onRequest() {
  return json(405, { ok: false, error: "method_not_allowed" });
}
__name(onRequest, "onRequest");

// api/order.js
var DUKAN_ORDERS_URL = "https://api.dukan.shop/api/orders";
var DUKAN_MISSED_URL = "https://api.dukan.shop/api/missed-orders";
var STORE_ORIGIN = "https://syda.dukan.shop";
var JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8" };
function json2(status, body) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}
__name(json2, "json");
function upstreamHeaders(ua) {
  return {
    "Content-Type": "application/json",
    "Origin": STORE_ORIGIN,
    "Referer": STORE_ORIGIN + "/checkout",
    "User-Agent": ua || "Mozilla/5.0",
    "Accept": "application/json"
  };
}
__name(upstreamHeaders, "upstreamHeaders");
function rid(len) {
  let s = "";
  const abc = "abcdefghijklmnopqrstuvwxyz";
  for (let i = 0; i < (len || 9); i++) s += abc[Math.floor(Math.random() * abc.length)];
  return s;
}
__name(rid, "rid");
async function onRequestPost2(context2) {
  const { request } = context2;
  let payload;
  try {
    payload = await request.json();
  } catch (e) {
    return json2(400, { status: "error", message: "Invalid JSON body", code: "BAD_JSON" });
  }
  const items = Array.isArray(payload && payload.items) ? payload.items : [];
  if (!items.length) {
    return json2(400, { status: "error", message: "Order must contain at least one item", code: "EMPTY_CART" });
  }
  const d = payload && payload.deliveryInfo || {};
  if (!d.name || !d.phone || !d.provinceId || !d.address) {
    return json2(400, { status: "error", message: "Missing required customer fields (name, phone, provinceId, address)", code: "MISSING_FIELDS" });
  }
  const ua = request.headers.get("User-Agent") || "Mozilla/5.0";
  const meta = payload.metadata = payload.metadata || {};
  const now = Date.now();
  const eventId = meta.eventId || (crypto.randomUUID ? crypto.randomUUID() : now + "-" + Math.random());
  const externalId = meta.externalId || (crypto.randomUUID ? crypto.randomUUID() : "ext-" + now);
  const sessionKey = "order_" + now + "_" + rid(9);
  meta.eventId = eventId;
  meta.eventTime = meta.eventTime || Math.floor(now / 1e3);
  meta.externalId = externalId;
  meta.sessionKey = sessionKey;
  meta.missedOrderId = meta.missedOrderId != null ? meta.missedOrderId : null;
  meta.inlineCheckout = meta.inlineCheckout === true;
  meta.eventSourceUrl = meta.eventSourceUrl || STORE_ORIGIN + "/checkout";
  meta.consent = meta.consent || "granted";
  meta.userAgent = ua;
  const compactItems = items.map((it) => ({
    productId: it.productId,
    quantity: it.quantity || 1,
    unitPrice: Number(it.unitPrice) || 0,
    subtotal: Number(it.subtotal) || 0
  }));
  const missedBody = {
    phone: d.phone,
    name: d.name,
    items: compactItems,
    subtotal: Number(payload.subtotal) || 0,
    shippingFee: Math.max(0, (Number(payload.total) || 0) - (Number(payload.subtotal) || 0)),
    total: Number(payload.total) || 0,
    eventId,
    provinceId: d.provinceId,
    metadata: {
      eventId,
      eventTime: meta.eventTime,
      userAgent: ua,
      eventSourceUrl: meta.eventSourceUrl,
      externalId,
      consent: "granted"
    }
  };
  try {
    await fetch(DUKAN_MISSED_URL, {
      method: "POST",
      headers: upstreamHeaders(ua),
      body: JSON.stringify(missedBody)
    });
  } catch (e) {
  }
  let upstream;
  try {
    upstream = await fetch(DUKAN_ORDERS_URL, {
      method: "POST",
      headers: upstreamHeaders(ua),
      body: JSON.stringify(payload)
    });
  } catch (e) {
    return json2(502, { status: "error", message: "Could not reach the order service", code: "UPSTREAM_UNREACHABLE" });
  }
  let data;
  try {
    data = await upstream.json();
  } catch (e) {
    return json2(502, { status: "error", message: "Unexpected response from the order service", code: "UPSTREAM_BAD_RESPONSE" });
  }
  if (data && data.status === "success" && data.orderId) {
    return json2(200, data);
  }
  if (data && data.orderId) {
    return json2(200, {
      status: "created",
      orderId: data.orderId,
      paymentLink: data.paymentLink || null,
      message: data.message != null ? String(data.message) : null
    });
  }
  return json2(502, {
    status: "error",
    message: String((data && data.message) != null ? data.message : "Order rejected"),
    code: "DUKAN_REJECTED",
    details: data
  });
}
__name(onRequestPost2, "onRequestPost");
async function onRequest2() {
  return json2(405, { status: "error", message: "Method not allowed", code: "METHOD_NOT_ALLOWED" });
}
__name(onRequest2, "onRequest");

// api/telegram.js
var CMDS = [
  "/chats \u2014 \u0627\u0644\u0645\u062D\u0627\u062F\u062B\u0627\u062A \u0627\u0644\u0645\u0641\u062A\u0648\u062D\u0629",
  "/open SID \u2014 \u0641\u062A\u062D \u0645\u062D\u0627\u062F\u062B\u0629 \u0648\u0627\u0644\u0631\u062F \u0639\u0644\u064A\u0647\u0627",
  "/assign SID ID \u2014 \u0625\u0633\u0646\u0627\u062F \u0645\u062D\u0627\u062F\u062B\u0629 \u0644\u0643\u0648\u0623\u062F\u0645\u064A\u0646",
  "/close SID \u2014 \u0625\u063A\u0644\u0627\u0642 \u0645\u062D\u0627\u062F\u062B\u0629 (\u0623\u0648 /done \u0644\u0644\u0645\u062D\u0627\u062F\u062B\u0629 \u0627\u0644\u062D\u0627\u0644\u064A\u0629)",
  "/leave \u2014 \u0641\u0643 \u0627\u0644\u0627\u0631\u062A\u0628\u0627\u0637 \u0628\u0627\u0644\u0645\u062D\u0627\u062F\u062B\u0629 \u0627\u0644\u062D\u0627\u0644\u064A\u0629",
  "/id \u2014 \u0645\u0639\u0631\u0651\u0641\u0643 \u0627\u0644\u062A\u064A\u0644\u064A\u063A\u0631\u0627\u0645\u064A"
];
var HELP_BY_ROLE = {
  superadmin: CMDS.concat([
    "/role ID admin|coadmin|none \u2014 \u062A\u0641\u0648\u064A\u0636 \u0627\u0644\u0635\u0644\u0627\u062D\u064A\u0627\u062A",
    "/admins \u2014 \u0641\u0631\u064A\u0642 \u0627\u0644\u062F\u0639\u0645 \u0648\u0627\u0644\u0623\u062F\u0648\u0627\u0631"
  ]),
  admin: CMDS.concat(["/admins \u2014 \u0641\u0631\u064A\u0642 \u0627\u0644\u062F\u0639\u0645 \u0648\u0627\u0644\u0623\u062F\u0648\u0627\u0631"]),
  coadmin: CMDS,
  none: []
};
function helpText(role, id) {
  if (role === "none") {
    return `\u{1F6E1} \u0647\u0630\u0627 \u0628\u0648\u062A <b>\u0641\u0631\u064A\u0642 \u062E\u062F\u0645\u0629 \u0639\u0645\u0644\u0627\u0621 \u0645\u062A\u062C\u0631 \u0635\u064A\u062F\u0629</b>.

\u0648\u0635\u0648\u0644\u0643 \u0645\u0642\u064A\u0651\u062F \u062D\u0627\u0644\u064A\u0627\u064B. \u0623\u0631\u0633\u0644 \u0645\u0639\u0631\u0651\u0641\u0643 \u0627\u0644\u062A\u0627\u0644\u064A \u0644\u0644\u0633\u0648\u0628\u0631 \u0623\u062F\u0645\u064A\u0646 \u0644\u062A\u0641\u0639\u064A\u0644 \u0635\u0644\u0627\u062D\u064A\u062A\u0643:
<code>${escHtml(id)}</code>`;
  }
  const lines = HELP_BY_ROLE[role].map((l) => "\u2022 " + escHtml(l)).join("\n");
  return `\u{1F44B} <b>\u0628\u0648\u062A \u062F\u0639\u0645 \u0635\u064A\u062F\u0629</b>
\u0635\u0644\u0627\u062D\u064A\u062A\u0643: <b>${ROLE_AR[role]}</b>

${lines}

\u0627\u0643\u062A\u0628 \u0623\u064A \u0646\u0635 \u0644\u0644\u0631\u062F \u0639\u0644\u0649 \u0627\u0644\u0645\u062D\u0627\u062F\u062B\u0629 \u0627\u0644\u0645\u0631\u062A\u0628\u0637\u0629 \u0628\u0643 (\u0627\u0641\u062A\u062D\u0647\u0627 \u0628\u0640 /open SID).`;
}
__name(helpText, "helpText");
function ago(ts) {
  const s = Math.max(1, Math.round((Date.now() - ts) / 1e3));
  if (s < 60) return "\u0627\u0644\u0622\u0646";
  if (s < 3600) return Math.floor(s / 60) + " \u062F";
  if (s < 86400) return Math.floor(s / 3600) + " \u0633";
  return Math.floor(s / 86400) + " \u064A";
}
__name(ago, "ago");
async function closeSession(env2, sess, byName) {
  sess.status = "closed";
  sess.updatedAt = Date.now();
  await putSession(env2.SUPPORT_KV, sess);
  await pushMsg(env2.SUPPORT_KV, sess.k, "sys", "", { code: "closed" });
  await removeFromOpen(env2.SUPPORT_KV, sess.k);
}
__name(closeSession, "closeSession");
async function findSessionBySid(env2, sid) {
  const keys = await getOpenKeys(env2.SUPPORT_KV);
  const open = await Promise.all(keys.map((k) => kvGet(env2.SUPPORT_KV, "sess:" + k)));
  return open.find((s) => s && s.sid === String(sid).toUpperCase()) || null;
}
__name(findSessionBySid, "findSessionBySid");
async function recentVisitorText(env2, k, lang) {
  const msgs = await loadMsgs(env2.SUPPORT_KV, k);
  const recent = msgs.list.filter((m) => m.from === "visitor").slice(-5);
  if (!recent.length) return lang === "en" ? "(no messages yet)" : "(\u0644\u0627 \u0631\u0633\u0627\u0626\u0644 \u0628\u0639\u062F)";
  return recent.map((m) => "\u{1F464} " + escHtml(m.text.slice(0, 200))).join("\n");
}
__name(recentVisitorText, "recentVisitorText");
async function cmdChats(env2, from, role) {
  const keys = await getOpenKeys(env2.SUPPORT_KV);
  if (!keys.length) return await tgSend(env2, from.id, "\u{1F4ED} \u0644\u0627 \u062A\u0648\u062C\u062F \u0645\u062D\u0627\u062F\u062B\u0627\u062A \u0645\u0641\u062A\u0648\u062D\u0629 \u062D\u0627\u0644\u064A\u0627\u064B.");
  const open = (await Promise.all(keys.map((k) => kvGet(env2.SUPPORT_KV, "sess:" + k)))).filter((s) => s && s.status === "open");
  let list = open;
  if (role === "coadmin") {
    const me = String(from.id);
    list = open.filter((s) => !s.assignee || String(s.assignee) === me);
  }
  if (!list.length) return await tgSend(env2, from.id, "\u{1F4ED} \u0644\u0627 \u062A\u0648\u062C\u062F \u0645\u062D\u0627\u062F\u062B\u0627\u062A \u0645\u062A\u0627\u062D\u0629 \u0644\u0643 (\u0627\u0644\u0645\u0633\u0646\u062F\u0629 \u0644\u0643 \u0641\u0642\u0637 \u0643\u0643\u0648\u0623\u062F\u0645\u064A\u0646).");
  list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  const rows = list.slice(0, 15).map((s) => {
    const assignee = s.assignee ? escHtml(s.assigneeName || "\u0648\u0643\u064A\u0644") : "\u2014";
    return `#${escHtml(s.sid)} \xB7 ${s.lang === "en" ? "EN" : "\u0639"} \xB7 \u0646\u0634\u0627\u0637 ${ago(s.updatedAt || s.createdAt)} \xB7 \u0648\u0643\u064A\u0644: ${assignee}`;
  });
  const buttons = list.slice(0, 10).map((s) => [{ text: "\u{1F4AC} " + s.sid, callback_data: "open:" + s.sid }]);
  await tgSend(env2, from.id, "\u{1F4CB} <b>\u0627\u0644\u0645\u062D\u0627\u062F\u062B\u0627\u062A \u0627\u0644\u0645\u0641\u062A\u0648\u062D\u0629</b>\n" + rows.join("\n"), {
    reply_markup: { inline_keyboard: buttons }
  });
}
__name(cmdChats, "cmdChats");
async function cmdOpen(env2, from, role, sid, callbackId) {
  const sess = await findSessionBySid(env2, sid);
  if (!sess) {
    if (callbackId) await tgAnswerCallback(env2, callbackId, "\u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0627\u0644\u0645\u062D\u0627\u062F\u062B\u0629");
    return await tgSend(env2, from.id, `\u274C \u0644\u0627 \u062A\u0648\u062C\u062F \u0645\u062D\u0627\u062F\u062B\u0629 \u0645\u0641\u062A\u0648\u062D\u0629 \u0628\u0627\u0644\u0645\u0639\u0631\u0651\u0641 ${escHtml(sid)}. \u062C\u0631\u0651\u0628 /chats`);
  }
  const me = String(from.id);
  if (role === "coadmin" && sess.assignee && String(sess.assignee) !== me) {
    if (callbackId) await tgAnswerCallback(env2, callbackId, "\u0645\u062D\u0627\u062F\u062B\u0629 \u0645\u064F\u0633\u0646\u062F\u0629 \u0644\u0648\u0643\u064A\u0644 \u0622\u062E\u0631");
    return await tgSend(env2, from.id, `\u{1F512} #${sess.sid} \u0645\u064F\u0633\u0646\u062F\u0629 \u0644\u0648\u0643\u064A\u0644 \u0622\u062E\u0631 \u2014 \u0627\u0644\u0643\u0648\u0623\u062F\u0645\u064A\u0646 \u064A\u0631\u062F \u0639\u0644\u0649 \u0627\u0644\u0645\u062D\u0627\u062F\u062B\u0627\u062A \u0627\u0644\u0645\u0633\u0646\u062F\u0629 \u0644\u0647 \u0641\u0642\u0637.`);
  }
  if (sess.status !== "open") {
    if (callbackId) await tgAnswerCallback(env2, callbackId, "\u0627\u0644\u0645\u062D\u0627\u062F\u062B\u0629 \u0645\u063A\u0644\u0642\u0629");
    return await tgSend(env2, from.id, `\u{1F512} #${sess.sid} \u0645\u063A\u0644\u0642\u0629 \u0628\u0627\u0644\u0641\u0639\u0644.`);
  }
  const name = (from.first_name || from.username || "\u0648\u0643\u064A\u0644").slice(0, 60);
  const wasUnassigned = !sess.assignee;
  const previous = sess.assigneeName || null;
  sess.assignee = me;
  sess.assigneeName = name;
  sess.updatedAt = Date.now();
  await putSession(env2.SUPPORT_KV, sess);
  await pushMsg(env2.SUPPORT_KV, sess.k, "sys", "", { code: "joined", name });
  await putStaff(env2.SUPPORT_KV, me, { cur: sess.k, name, lastSeen: Date.now() });
  const context2 = await recentVisitorText(env2, sess.k, sess.lang);
  const header = `\u2705 \u0623\u0646\u062A \u0627\u0644\u0622\u0646 \u062A\u0631\u062F \u0639\u0644\u0649 <b>#${escHtml(sess.sid)}</b>` + (wasUnassigned ? "" : ` (\u0646\u064F\u0642\u0644\u062A \u0645\u0646 ${escHtml(previous || "\u0648\u0643\u064A\u0644")})`) + `
\u{1F310} ${sess.lang === "en" ? "English" : "\u0627\u0644\u0639\u0631\u0628\u064A\u0629"} \xB7 ${sess.page ? "\u0645\u0646: " + escHtml(shortPage(sess.page)) : ""}

\u0622\u062E\u0631 \u0631\u0633\u0627\u0626\u0644 \u0627\u0644\u0632\u0627\u0626\u0631:
${context2}

\u0627\u0643\u062A\u0628 \u0631\u0633\u0627\u0644\u062A\u0643 \u0627\u0644\u0622\u0646 \u2014 \u0633\u062A\u0638\u0647\u0631 \u0644\u0644\u0632\u0627\u0626\u0631 \u0645\u0628\u0627\u0634\u0631\u0629. \u0639\u0646\u062F \u0627\u0644\u0627\u0646\u062A\u0647\u0627\u0621: /done`;
  if (callbackId) await tgAnswerCallback(env2, callbackId, "\u062A\u0645 \u0641\u062A\u062D " + sess.sid);
  return await tgSend(env2, from.id, header);
}
__name(cmdOpen, "cmdOpen");
function shortPage(url) {
  try {
    const u = new URL(url);
    return u.pathname.length > 30 ? u.pathname.slice(0, 30) + "\u2026" : u.pathname;
  } catch (e) {
    return String(url).slice(0, 30);
  }
}
__name(shortPage, "shortPage");
async function cmdAssign(env2, from, role, sid, targetId) {
  const sess = await findSessionBySid(env2, sid);
  if (!sess) return await tgSend(env2, from.id, `\u274C \u0644\u0627 \u062A\u0648\u062C\u062F \u0645\u062D\u0627\u062F\u062B\u0629 \u0628\u0627\u0644\u0645\u0639\u0631\u0651\u0641 ${escHtml(sid)}.`);
  const targetRole = await roleOf(env2.SUPPORT_KV, targetId);
  if (targetRole === "none") {
    return await tgSend(env2, from.id, `\u274C <code>${escHtml(targetId)}</code> \u0644\u064A\u0633 \u0645\u0646 \u0641\u0631\u064A\u0642 \u0627\u0644\u062F\u0639\u0645 \u2014 \u0623\u0639\u0637\u0647 \u0635\u0644\u0627\u062D\u064A\u0629 \u0623\u0648\u0644\u0627\u064B (\u0643\u0648\u0623\u062F\u0645\u064A\u0646 \u0623\u0648 \u0623\u062F\u0645\u0646).`);
  }
  const targetStaff = await getStaff(env2.SUPPORT_KV, targetId);
  const name = targetStaff.name || "\u0627\u0644\u0648\u0643\u064A\u0644";
  sess.assignee = String(targetId);
  sess.assigneeName = name;
  sess.updatedAt = Date.now();
  await putSession(env2.SUPPORT_KV, sess);
  await pushMsg(env2.SUPPORT_KV, sess.k, "sys", "", { code: "joined", name });
  const context2 = await recentVisitorText(env2, sess.k, sess.lang);
  await putStaff(env2.SUPPORT_KV, String(targetId), { ...targetStaff, cur: sess.k, lastSeen: Date.now() });
  await tgSend(env2, targetId, `\u{1F4CB} \u0623\u064F\u0633\u0646\u062F\u062A \u0625\u0644\u064A\u0643 \u0645\u062D\u0627\u062F\u062B\u0629 <b>#${escHtml(sess.sid)}</b>:
${context2}

\u0627\u0643\u062A\u0628 \u0631\u062F\u0643 \u0645\u0628\u0627\u0634\u0631\u0629 \u0647\u0646\u0627. \u0639\u0646\u062F \u0627\u0644\u0627\u0646\u062A\u0647\u0627\u0621: /done`);
  return await tgSend(env2, from.id, `\u2705 \u062A\u0645 \u0625\u0633\u0646\u0627\u062F #${escHtml(sess.sid)} \u0625\u0644\u0649 ${escHtml(name)} (${ROLE_AR[targetRole]}).`);
}
__name(cmdAssign, "cmdAssign");
async function cmdClose(env2, from, role, sid) {
  const me = String(from.id);
  let sess = sid ? await findSessionBySid(env2, sid) : null;
  if (!sess && !sid) {
    const staff2 = await getStaff(env2.SUPPORT_KV, me);
    if (staff2.cur) sess = await getSession(env2.SUPPORT_KV, staff2.cur);
  }
  if (!sess) return await tgSend(env2, from.id, "\u274C \u062D\u062F\u062F \u0645\u062D\u0627\u062F\u062B\u0629: /close SID (\u0623\u0648 \u0627\u0641\u062A\u062D \u0645\u062D\u0627\u062F\u062B\u0629 \u0623\u0648\u0644\u0627\u064B \u0628\u0640 /open).");
  if (sess.status !== "open") return await tgSend(env2, from.id, `#${sess.sid} \u0645\u063A\u0644\u0642\u0629 \u0628\u0627\u0644\u0641\u0639\u0644.`);
  if (role === "coadmin" && String(sess.assignee) !== me) {
    return await tgSend(env2, from.id, "\u{1F512} \u0627\u0644\u0643\u0648\u0623\u062F\u0645\u064A\u0646 \u064A\u063A\u0644\u0642 \u0645\u062D\u0627\u062F\u062B\u0627\u062A\u0647 \u0627\u0644\u0645\u0633\u0646\u062F\u0629 \u0641\u0642\u0637.");
  }
  await closeSession(env2, sess, "staff");
  const staff = await getStaff(env2.SUPPORT_KV, me);
  if (staff.cur === sess.k) await putStaff(env2.SUPPORT_KV, me, { ...staff, cur: null });
  if (sess.assignee && String(sess.assignee) !== me) {
    await tgSend(env2, sess.assignee, `\u2705 #${escHtml(sess.sid)} \u0623\u064F\u063A\u0644\u0642\u062A \u0628\u0648\u0627\u0633\u0637\u0629 ${escHtml(from.first_name || "\u0627\u0644\u0623\u062F\u0645\u0646")}.`);
  }
  return await tgSend(env2, from.id, `\u2705 \u0623\u064F\u063A\u0644\u0642\u062A \u0627\u0644\u0645\u062D\u0627\u062F\u062B\u0629 #${escHtml(sess.sid)} \u2014 \u0634\u0643\u0631\u0627\u064B \u0644\u0643!`);
}
__name(cmdClose, "cmdClose");
async function cmdRole(env2, from, role, args) {
  if (role !== "superadmin") {
    return await tgSend(env2, from.id, "\u{1F512} \u062A\u0641\u0648\u064A\u0636 \u0627\u0644\u0635\u0644\u0627\u062D\u064A\u0627\u062A \u0645\u062A\u0627\u062D \u0644\u0644\u0633\u0648\u0628\u0631 \u0623\u062F\u0645\u064A\u0646 \u0641\u0642\u0637.");
  }
  const parts = args.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) {
    const staff = await allStaffIds(env2.SUPPORT_KV);
    return await tgSend(env2, from.id, "\u0627\u0644\u0627\u0633\u062A\u062E\u062F\u0627\u0645: <code>/role ID admin|coadmin|none</code>");
  }
  const targetId = parts[0].replace(/[^\d]/g, "");
  const action = (parts[1] || "").toLowerCase();
  if (!targetId || !["admin", "coadmin", "none"].includes(action)) {
    return await tgSend(env2, from.id, "\u0627\u0644\u0627\u0633\u062A\u062E\u062F\u0627\u0645: <code>/role ID admin|coadmin|none</code>");
  }
  if (targetId === SUPERADMIN_SEED && action !== "admin") {
    return await tgSend(env2, from.id, "\u26A0\uFE0F \u0627\u0644\u0633\u0648\u0628\u0631 \u0623\u062F\u0645\u064A\u0646 \u0627\u0644\u0631\u0626\u064A\u0633\u064A \u062B\u0627\u0628\u062A \u0648\u0644\u0627 \u064A\u064F\u062E\u0641\u0636.");
  }
  const roles = await getRoles(env2.SUPPORT_KV);
  roles.admins.delete(targetId);
  roles.coadmins.delete(targetId);
  if (action === "admin") roles.admins.add(targetId);
  if (action === "coadmin") roles.coadmins.add(targetId);
  await putRoles(env2.SUPPORT_KV, roles);
  const targetStaff = await getStaff(env2.SUPPORT_KV, targetId);
  await tgSend(env2, targetId, `\u{1F514} \u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0635\u0644\u0627\u062D\u064A\u062A\u0643 \u0641\u064A \u0628\u0648\u062A \u062F\u0639\u0645 \u0635\u064A\u062F\u0629: <b>${ROLE_AR[action] === "\u0628\u062F\u0648\u0646 \u0635\u0644\u0627\u062D\u064A\u0629" ? "\u0628\u062F\u0648\u0646 \u0635\u0644\u0627\u062D\u064A\u0629" : ROLE_AR[action]}</b>. \u0623\u0631\u0633\u0644 /help \u0644\u0644\u0627\u0637\u0644\u0627\u0639 \u0639\u0644\u0649 \u0627\u0644\u0623\u0648\u0627\u0645\u0631.`);
  return await tgSend(env2, from.id, `\u2705 \u0635\u0644\u0627\u062D\u064A\u0629 <code>${targetId}</code> \u0623\u0635\u0628\u062D\u062A: <b>${ROLE_AR[action]}</b>`);
}
__name(cmdRole, "cmdRole");
async function cmdAdmins(env2, from, role) {
  if (role === "none" || role === "coadmin") {
    return await tgSend(env2, from.id, "\u{1F512} \u0645\u062A\u0627\u062D \u0644\u0644\u0623\u062F\u0645\u0646 \u0641\u0623\u0639\u0644\u0649.");
  }
  const staff = await allStaffIds(env2.SUPPORT_KV);
  const fmt = /* @__PURE__ */ __name((ids, label) => ids.length ? `
<b>${label}</b>:
` + ids.map((i) => "<code>" + escHtml(i) + "</code>").join("\n") : "", "fmt");
  const text = "\u{1F465} <b>\u0641\u0631\u064A\u0642 \u062F\u0639\u0645 \u0635\u064A\u062F\u0629</b>" + fmt(staff.superadmins, "\u0633\u0648\u0628\u0631 \u0623\u062F\u0645\u064A\u0646") + fmt(staff.admins, "\u0623\u062F\u0645\u0646") + fmt(staff.coadmins, "\u0643\u0648\u0623\u062F\u0645\u064A\u0646");
  await tgSend(env2, from.id, text);
}
__name(cmdAdmins, "cmdAdmins");
async function cmdLeave(env2, from) {
  const me = String(from.id);
  const staff = await getStaff(env2.SUPPORT_KV, me);
  if (!staff.cur) return await tgSend(env2, from.id, "\u0644\u0627 \u062A\u0648\u062C\u062F \u0645\u062D\u0627\u062F\u062B\u0629 \u0645\u0631\u062A\u0628\u0637\u0629 \u0628\u0643 \u062D\u0627\u0644\u064A\u0627\u064B.");
  await putStaff(env2.SUPPORT_KV, me, { ...staff, cur: null });
  return await tgSend(env2, from.id, "\u21A9\uFE0F \u062A\u0645 \u0641\u0643 \u0627\u0644\u0627\u0631\u062A\u0628\u0627\u0637 \u0628\u0627\u0644\u0645\u062D\u0627\u062F\u062B\u0629 \u0627\u0644\u062D\u0627\u0644\u064A\u0629 (\u0644\u0645 \u062A\u064F\u063A\u0644\u0642).");
}
__name(cmdLeave, "cmdLeave");
async function handleReply(env2, from, role, text) {
  const me = String(from.id);
  const staff = await getStaff(env2.SUPPORT_KV, me);
  const name = (from.first_name || from.username || "\u0648\u0643\u064A\u0644").slice(0, 60);
  await putStaff(env2.SUPPORT_KV, me, { ...staff, name, lastSeen: Date.now() });
  if (!staff.cur) {
    return await tgSend(env2, from.id, "\u{1F4CC} \u0644\u0627 \u062A\u0648\u062C\u062F \u0645\u062D\u0627\u062F\u062B\u0629 \u0645\u0631\u062A\u0628\u0637\u0629 \u0628\u0643. \u0627\u0639\u0631\u0636 \u0627\u0644\u0645\u0641\u062A\u0648\u062D\u0629 \u0628\u0640 /chats \u062B\u0645 \u0627\u0641\u062A\u062D \u0648\u0627\u062D\u062F\u0629 \u0628\u0640 /open SID.");
  }
  const sess = await getSession(env2.SUPPORT_KV, staff.cur);
  if (!sess || sess.status !== "open") {
    await putStaff(env2.SUPPORT_KV, me, { ...staff, cur: null });
    return await tgSend(env2, from.id, "\u{1F512} \u0627\u0644\u0645\u062D\u0627\u062F\u062B\u0629 \u0627\u0644\u0645\u0631\u062A\u0628\u0637\u0629 \u0628\u0643 \u0644\u0645 \u062A\u0639\u062F \u0645\u0641\u062A\u0648\u062D\u0629. \u062C\u0631\u0651\u0628 /chats");
  }
  if (role === "coadmin" && String(sess.assignee) !== me) {
    return await tgSend(env2, from.id, `\u{1F512} #${escHtml(sess.sid)} \u0645\u064F\u0633\u0646\u062F\u0629 \u0644\u0648\u0643\u064A\u0644 \u0622\u062E\u0631 \u2014 \u0631\u062F\u0648\u062F\u0643 \u062A\u064F\u0631\u0633\u0644 \u0644\u0645\u062D\u0627\u062F\u062B\u0627\u062A\u0643 \u0641\u0642\u0637.`);
  }
  await pushMsg(env2.SUPPORT_KV, sess.k, "staff", text, { name });
}
__name(handleReply, "handleReply");
async function handleUpdate(env2, update) {
  const cb = update.callback_query;
  if (cb && cb.data && cb.data.startsWith("open:")) {
    const from2 = cb.from || {};
    const role2 = await roleOf(env2.SUPPORT_KV, from2.id);
    if (role2 === "none") return await tgAnswerCallback(env2, cb.id, "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u2014 \u062A\u0648\u0627\u0635\u0644 \u0645\u0639 \u0627\u0644\u0633\u0648\u0628\u0631 \u0623\u062F\u0645\u064A\u0646");
    await cmdOpen(env2, from2, role2, cb.data.slice(5), cb.id);
    return;
  }
  const message = update.message;
  if (!message || !message.text) {
    if (message && message.from) {
      await tgSend(env2, message.from.id, "\u{1F4E9} \u062D\u0627\u0644\u064A\u0627\u064B \u064A\u062F\u0639\u0645 \u0627\u0644\u0628\u0648\u062A \u0627\u0644\u0631\u0633\u0627\u0626\u0644 \u0627\u0644\u0646\u0635\u064A\u0629 \u0641\u0642\u0637 \u2014 \u0623\u0631\u0633\u0644 \u0646\u0635\u0627\u064B.");
    }
    return;
  }
  const from = message.from || {};
  const id = String(from.id);
  const text = String(message.text || "").trim();
  const role = await roleOf(env2.SUPPORT_KV, id);
  const staff = await getStaff(env2.SUPPORT_KV, id);
  await putStaff(env2.SUPPORT_KV, id, { ...staff, name: (from.first_name || from.username || "").slice(0, 60), lastSeen: Date.now() });
  if (/^\/(start|help)$/i.test(text)) return await tgSend(env2, id, helpText(role, id));
  if (/^\/id$/i.test(text)) {
    return await tgSend(env2, id, `\u{1F194} \u0645\u0639\u0631\u0651\u0641\u0643: <code>${escHtml(id)}</code>
\u0635\u0644\u0627\u062D\u064A\u062A\u0643: <b>${ROLE_AR[role]}</b>`);
  }
  if (role === "none") return await tgSend(env2, id, helpText("none", id));
  if (/^\/chats?$/i.test(text)) return await cmdChats(env2, from, role);
  if (/^\/open\s+(\S+)/i.test(text)) return await cmdOpen(env2, from, role, text.match(/^\/open\s+(\S+)/i)[1], null);
  if (/^\/(open|chat)$/i.test(text)) return await tgSend(env2, id, "\u0627\u0644\u0627\u0633\u062A\u062E\u062F\u0627\u0645: /open SID \u2014 \u062E\u0630 \u0627\u0644\u0645\u0639\u0631\u0641 \u0645\u0646 /chats");
  if (/^\/assign\s+(\S+)\s+(\d+)/i.test(text)) {
    const m = text.match(/^\/assign\s+(\S+)\s+(\d+)/i);
    if (role === "coadmin") return await tgSend(env2, id, "\u{1F512} \u0627\u0644\u0625\u0633\u0646\u0627\u062F \u0645\u062A\u0627\u062D \u0644\u0644\u0623\u062F\u0645\u0646 \u0641\u0623\u0639\u0644\u0649.");
    return await cmdAssign(env2, from, role, m[1], m[2]);
  }
  if (/^\/(close|done)(\s+\S+)?$/i.test(text)) {
    const m = text.match(/^\/(?:close|done)(?:\s+(\S+))?$/i);
    return await cmdClose(env2, from, role, m[1] || null);
  }
  if (/^\/leave$/i.test(text)) return await cmdLeave(env2, from);
  if (/^\/role(\s|$)/i.test(text)) return await cmdRole(env2, from, role, text.replace(/^\/role\s*/i, ""));
  if (/^\/admins?$/i.test(text)) return await cmdAdmins(env2, from, role);
  return await handleReply(env2, from, role, text.slice(0, 1e3));
}
__name(handleUpdate, "handleUpdate");
async function onRequestPost3(context2) {
  const { request, env: env2 } = context2;
  const secret = env2.TG_WEBHOOK_SECRET;
  if (secret && request.headers.get("X-Telegram-Bot-Api-Secret-Token") !== secret) {
    return json(403, { ok: false });
  }
  let update;
  try {
    update = await request.json();
  } catch (e) {
    return json(400, { ok: false });
  }
  if (!update || typeof update !== "object") return json(400, { ok: false });
  try {
    await handleUpdate(env2, update);
  } catch (e) {
    console.error("tg_webhook_error", e && e.stack || String(e));
  }
  return json(200, { ok: true });
}
__name(onRequestPost3, "onRequestPost");
async function onRequest3() {
  return json(405, { ok: false, error: "method_not_allowed" });
}
__name(onRequest3, "onRequest");

// ../.wrangler/tmp/pages-FS6rL1/functionsRoutes-0.6118002906559703.mjs
var routes = [
  {
    routePath: "/api/support/:route",
    mountPath: "/api/support",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet]
  },
  {
    routePath: "/api/support/:route",
    mountPath: "/api/support",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost]
  },
  {
    routePath: "/api/support/:route",
    mountPath: "/api/support",
    method: "",
    middlewares: [],
    modules: [onRequest]
  },
  {
    routePath: "/api/order",
    mountPath: "/api",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost2]
  },
  {
    routePath: "/api/telegram",
    mountPath: "/api",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost3]
  },
  {
    routePath: "/api/order",
    mountPath: "/api",
    method: "",
    middlewares: [],
    modules: [onRequest2]
  },
  {
    routePath: "/api/telegram",
    mountPath: "/api",
    method: "",
    middlewares: [],
    modules: [onRequest3]
  }
];

// ../../../../.npm/_npx/32026684e21afda6/node_modules/path-to-regexp/dist.es2015/index.js
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count3 = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count3--;
          if (count3 === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count3++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count3)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
__name(lexer, "lexer");
function parse(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = /* @__PURE__ */ __name(function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  }, "tryConsume");
  var mustConsume = /* @__PURE__ */ __name(function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  }, "mustConsume");
  var consumeText = /* @__PURE__ */ __name(function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  }, "consumeText");
  var isSafe = /* @__PURE__ */ __name(function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  }, "isSafe");
  var safePattern = /* @__PURE__ */ __name(function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  }, "safePattern");
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
__name(parse, "parse");
function match(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
__name(match, "match");
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = /* @__PURE__ */ __name(function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    }, "_loop_1");
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path, index, params };
  };
}
__name(regexpToFunction, "regexpToFunction");
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(escapeString, "escapeString");
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
__name(flags, "flags");
function regexpToRegexp(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
__name(regexpToRegexp, "regexpToRegexp");
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
__name(arrayToRegexp, "arrayToRegexp");
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse(path, options), keys, options);
}
__name(stringToRegexp, "stringToRegexp");
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start2 = _b === void 0 ? true : _b, _c = options.end, end2 = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start2 ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end2) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
__name(tokensToRegexp, "tokensToRegexp");
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
__name(pathToRegexp, "pathToRegexp");

// ../../../../.npm/_npx/32026684e21afda6/node_modules/wrangler/templates/pages-template-worker.ts
var escapeRegex = /[.+?^${}()|[\]\\]/g;
function getOriginalPathPrefix(requestPath, normalizedPrefix) {
  let end2 = 0;
  for (let index = 0; index < normalizedPrefix.length; index++) {
    end2++;
    if (normalizedPrefix[index] === "/") {
      while (requestPath[end2] === "/") {
        end2++;
      }
    }
  }
  return requestPath.slice(0, end2);
}
__name(getOriginalPathPrefix, "getOriginalPathPrefix");
function* executeRequest(request) {
  const requestPath = new URL(request.url).pathname;
  const normalizedRequestPath = requestPath.replace(/\/+/g, "/");
  for (const route of [...routes].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath) || routeMatcher(normalizedRequestPath);
    const originalMountMatch = mountMatcher(requestPath);
    const mountMatchResult = originalMountMatch || mountMatcher(normalizedRequestPath);
    if (matchResult && mountMatchResult) {
      const path = originalMountMatch ? originalMountMatch.path : getOriginalPathPrefix(requestPath, mountMatchResult.path);
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path
        };
      }
    }
  }
  for (const route of routes) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: true
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}
__name(executeRequest, "executeRequest");
var pages_template_worker_default = {
  async fetch(originalRequest, env2, workerContext) {
    let request = originalRequest;
    const handlerIterator = executeRequest(request);
    let data = {};
    let isFailOpen = false;
    const next = /* @__PURE__ */ __name(async (input, init) => {
      if (input !== void 0) {
        let url = input;
        if (typeof input === "string") {
          url = new URL(input, request.url).toString();
        }
        request = new Request(url, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const { handler, params, path } = result.value;
        const context2 = {
          request: new Request(request.clone()),
          functionPath: path,
          next,
          params,
          get data() {
            return data;
          },
          set data(value) {
            if (typeof value !== "object" || value === null) {
              throw new Error("context.data must be an object");
            }
            data = value;
          },
          env: env2,
          waitUntil: workerContext.waitUntil.bind(workerContext),
          passThroughOnException: /* @__PURE__ */ __name(() => {
            isFailOpen = true;
          }, "passThroughOnException")
        };
        const response = await handler(context2);
        if (!(response instanceof Response)) {
          throw new Error("Your Pages function should return a Response");
        }
        return cloneResponse(response);
      } else if ("ASSETS") {
        const response = await env2["ASSETS"].fetch(request);
        return cloneResponse(response);
      } else {
        const response = await fetch(request);
        return cloneResponse(response);
      }
    }, "next");
    try {
      return await next();
    } catch (error3) {
      if (isFailOpen) {
        const response = await env2["ASSETS"].fetch(request);
        return cloneResponse(response);
      }
      throw error3;
    }
  }
};
var cloneResponse = /* @__PURE__ */ __name((response) => (
  // https://fetch.spec.whatwg.org/#null-body-status
  new Response(
    [101, 204, 205, 304].includes(response.status) ? null : response.body,
    response
  )
), "cloneResponse");

// ../../../../.npm/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env2, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env2);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../../../.npm/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env2, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env2);
  } catch (e) {
    const error3 = reduceError(e);
    const body = JSON.stringify(error3);
    const headers = {
      "Content-Type": "application/json",
      "MF-Experimental-Error-Stack": "true"
    };
    const encoded = encodeURIComponent(body);
    if (encoded.length <= 8192) {
      headers["MF-Experimental-Error-Stack-Payload"] = encoded;
    }
    return new Response(body, { status: 500, headers });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// ../.wrangler/tmp/bundle-VxWSN8/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = pages_template_worker_default;

// ../../../../.npm/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env2, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env2, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env2, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env2, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// ../.wrangler/tmp/bundle-VxWSN8/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  scheduledTime;
  cron;
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env2, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env2, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env2, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env2, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env2, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env2, ctx) => {
      this.env = env2;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=functionsWorker-0.18276460548330253.mjs.map
