"use strict";

function _interopDefault(e) {
    return e && "object" == typeof e && "default" in e ? e.default : e;
}

var Socket = _interopDefault(require("uws"));

function logError(e) {
    return console.log(e);
}

function uint8ArrayToString(e) {
    let t = "", n = 65535;
    const s = e.length;
    for (let o = 0; o < s; o += n) o + n > s && (n = s - o), t += String.fromCharCode.apply(null, e.subarray(o, o + n));
    return t;
}

function stringToArrayBuffer(e) {
    const t = e.length, n = new Uint8Array(t);
    for (let s = 0; s < t; s++) n[s] = e.charCodeAt(s);
    return n.buffer;
}

class Channel {
    constructor(e, t) {
        this.name = t, this.socket = e, this.subscribe();
    }
    watch(e) {
        return "[object Function]" !== {}.toString.call(e) ? logError("Listener must be a function") : (this.listener = e, 
        this);
    }
    publish(e) {
        return this.socket.send(this.name, e, "publish"), this;
    }
    unsubscribe() {
        this.socket.send("unsubscribe", this.name, "system"), this.socket.channels[this.name] = null;
    }
    onMessage(e) {
        this.listener && this.listener.call(null, e);
    }
    subscribe() {
        this.socket.send("subscribe", this.name, "system");
    }
}

class EventEmitter {
    constructor() {
        this.events = {};
    }
    on(e, t) {
        if ("[object Function]" !== {}.toString.call(t)) return logError("Listener must be a function");
        this.events[e] = t;
    }
    emit(e, ...t) {
        this.events[e] && this.events[e](...t);
    }
    removeAllEvents() {
        this.events = {};
    }
}

function decode(e, t) {
    const n = e.options.encodeDecodeEngine ? e.options.encodeDecodeEngine.decode(t["#"][2]) : t["#"][2], s = {
        e: () => e.events.emit(t["#"][1], n),
        p: () => e.channels[t["#"][1]] && e.channels[t["#"][1]].onMessage(n),
        s: {
            c: () => {
                e.useBinary = n.binary, e.resetPing(n.ping), e.events.emit("connect");
            }
        }
    };
    return "s" === t["#"][0] ? s[t["#"][0]][t["#"][1]] && s[t["#"][0]][t["#"][1]]() : s[t["#"][0]] && s[t["#"][0]]();
}

function encode(e, t, n) {
    const s = {
        emit: {
            "#": [ "e", e, t ]
        },
        publish: {
            "#": [ "p", e, t ]
        },
        system: {
            subscribe: {
                "#": [ "s", "s", t ]
            },
            unsubscribe: {
                "#": [ "s", "u", t ]
            }
        }
    };
    return JSON.stringify("system" === n ? s[n][e] : s[n]);
}

class ClusterWS {
    constructor(e) {
        return this.events = new EventEmitter(), this.channels = {}, this.pong = stringToArrayBuffer("A"), 
        this.reconnectionAttempted = 0, this.options = {
            url: e.url,
            autoReconnect: e.autoReconnect || !1,
            autoReconnectOptions: e.autoReconnectOptions ? {
                attempts: e.autoReconnectOptions.attempts || 0,
                minInterval: e.autoReconnectOptions.minInterval || 1e3,
                maxInterval: e.autoReconnectOptions.maxInterval || 5e3
            } : {
                attempts: 0,
                minInterval: 1e3,
                maxInterval: 5e3
            },
            encodeDecodeEngine: e.encodeDecodeEngine || !1
        }, this.options.url ? this.options.autoReconnectOptions.minInterval > this.options.autoReconnectOptions.maxInterval ? logError("minInterval option can not be more than maxInterval option") : void this.create() : logError("Url must be provided and it must be a string");
    }
    on(e, t) {
        this.events.on(e, t);
    }
    getState() {
        return this.websocket.readyState;
    }
    resetPing(e) {
        e && (this.pingInterval = e), clearTimeout(this.pingTimeout), this.pingTimeout = setTimeout(() => this.disconnect(4001, "Did not get pings"), 2 * this.pingInterval + 100);
    }
    disconnect(e, t) {
        this.websocket.close(e || 1e3, t);
    }
    send(e, t, n = "emit") {
        t = this.options.encodeDecodeEngine ? this.options.encodeDecodeEngine.encode(t) : t, 
        this.websocket.send(this.useBinary ? stringToArrayBuffer(encode(e, t, n)) : encode(e, t, n));
    }
    subscribe(e) {
        return this.channels[e] ? this.channels[e] : this.channels[e] = new Channel(this, e);
    }
    getChannelByName(e) {
        return this.channels[e];
    }
    create() {
        this.websocket = new Socket(this.options.url), this.websocket.binaryType = "arraybuffer", 
        this.websocket.onopen = (() => {
            this.reconnectionAttempted = 0;
            for (let e = 0, t = Object.keys(this.channels), n = t.length; e < n; e++) this.channels.hasOwnProperty(t[e]) && this.channels[t[e]].subscribe();
        }), this.websocket.onclose = (e => {
            if (clearTimeout(this.pingTimeout), this.events.emit("disconnect", e.code, e.reason), 
            this.options.autoReconnect && 1e3 !== e.code && (0 === this.options.autoReconnectOptions.attempts || this.reconnectionAttempted < this.options.autoReconnectOptions.attempts)) this.websocket.readyState === this.websocket.CLOSED ? (this.reconnectionAttempted++, 
            this.websocket = void 0, setTimeout(() => this.create(), Math.floor(Math.random() * (this.options.autoReconnectOptions.maxInterval - this.options.autoReconnectOptions.minInterval + 1)))) : console.log("Some thing went wrong with close event please contact developer"); else {
                this.events.removeAllEvents();
                for (let e = 0, t = Object.keys(this), n = t.length; e < n; e++) this[t[e]] = null;
            }
        }), this.websocket.onmessage = (e => {
            const t = "string" != typeof e.data ? new Uint8Array(e.data) : e.data;
            if (57 === t[0]) return this.websocket.send(this.pong), this.resetPing();
            try {
                decode(this, JSON.parse("string" == typeof t ? t : uint8ArrayToString(t)));
            } catch (e) {
                return logError(e);
            }
        }), this.websocket.onerror = (e => this.events.emit("error", e));
    }
}

module.exports = ClusterWS, module.exports.default = ClusterWS;
