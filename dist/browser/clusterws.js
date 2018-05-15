var ClusterWS = function(t) {
    "use strict";
    function e(t) {
        return console.log(t);
    }
    function n(t) {
        const e = t.length, n = new Uint8Array(e);
        for (let s = 0; s < e; s++) n[s] = t.charCodeAt(s);
        return n.buffer;
    }
    t = t && t.hasOwnProperty("default") ? t.default : t;
    class s {
        constructor(t, e) {
            this.name = e, this.socket = t, this.subscribe();
        }
        watch(t) {
            return "[object Function]" !== {}.toString.call(t) ? e("Listener must be a function") : (this.listener = t, 
            this);
        }
        publish(t) {
            return this.socket.send(this.name, t, "publish"), this;
        }
        unsubscribe() {
            this.socket.send("unsubscribe", this.name, "system"), this.socket.channels[this.name] = null;
        }
        onMessage(t) {
            this.listener && this.listener.call(null, t);
        }
        subscribe() {
            this.socket.send("subscribe", this.name, "system");
        }
    }
    class i {
        constructor() {
            this.events = {};
        }
        on(t, n) {
            if ("[object Function]" !== {}.toString.call(n)) return e("Listener must be a function");
            this.events[t] = n;
        }
        emit(t, ...e) {
            this.events[t] && this.events[t](...e);
        }
        removeAllEvents() {
            this.events = {};
        }
    }
    function o(t, e, n) {
        const s = {
            emit: {
                "#": [ "e", t, e ]
            },
            publish: {
                "#": [ "p", t, e ]
            },
            system: {
                subscribe: {
                    "#": [ "s", "s", e ]
                },
                unsubscribe: {
                    "#": [ "s", "u", e ]
                }
            }
        };
        return JSON.stringify("system" === n ? s[n][t] : s[n]);
    }
    return class {
        constructor(t) {
            return this.events = new i(), this.channels = {}, this.pong = n("A"), this.reconnectionAttempted = 0, 
            this.options = {
                url: t.url,
                autoReconnect: t.autoReconnect || !1,
                autoReconnectOptions: t.autoReconnectOptions ? {
                    attempts: t.autoReconnectOptions.attempts || 0,
                    minInterval: t.autoReconnectOptions.minInterval || 1e3,
                    maxInterval: t.autoReconnectOptions.maxInterval || 5e3
                } : {
                    attempts: 0,
                    minInterval: 1e3,
                    maxInterval: 5e3
                },
                encodeDecodeEngine: t.encodeDecodeEngine || !1
            }, this.options.url ? this.options.autoReconnectOptions.minInterval > this.options.autoReconnectOptions.maxInterval ? e("minInterval option can not be more than maxInterval option") : void this.create() : e("Url must be provided and it must be a string");
        }
        on(t, e) {
            this.events.on(t, e);
        }
        getState() {
            return this.websocket.readyState;
        }
        resetPing(t) {
            t && (this.pingInterval = t), clearTimeout(this.pingTimeout), this.pingTimeout = setTimeout(() => this.disconnect(4001, "Did not get pings"), 2 * this.pingInterval + 100);
        }
        disconnect(t, e) {
            this.websocket.close(t || 1e3, e);
        }
        send(t, e, s = "emit") {
            e = this.options.encodeDecodeEngine ? this.options.encodeDecodeEngine.encode(e) : e, 
            this.websocket.send(this.useBinary ? n(o(t, e, s)) : o(t, e, s));
        }
        subscribe(t) {
            return this.channels[t] ? this.channels[t] : this.channels[t] = new s(this, t);
        }
        getChannelByName(t) {
            return this.channels[t];
        }
        create() {
            this.websocket = new t(this.options.url), this.websocket.binaryType = "arraybuffer", 
            this.websocket.onopen = (() => {
                this.reconnectionAttempted = 0;
                for (let t = 0, e = Object.keys(this.channels), n = e.length; t < n; t++) this.channels.hasOwnProperty(e[t]) && this.channels[e[t]].subscribe();
            }), this.websocket.onclose = (t => {
                if (clearTimeout(this.pingTimeout), this.events.emit("disconnect", t.code, t.reason), 
                this.options.autoReconnect && 1e3 !== t.code && (0 === this.options.autoReconnectOptions.attempts || this.reconnectionAttempted < this.options.autoReconnectOptions.attempts)) this.websocket.readyState === this.websocket.CLOSED ? (this.reconnectionAttempted++, 
                this.websocket = void 0, setTimeout(() => this.create(), Math.floor(Math.random() * (this.options.autoReconnectOptions.maxInterval - this.options.autoReconnectOptions.minInterval + 1)))) : console.log("Some thing went wrong with close event please contact developer"); else {
                    this.events.removeAllEvents();
                    for (let t = 0, e = Object.keys(this), n = e.length; t < n; t++) this[e[t]] = null;
                }
            }), this.websocket.onmessage = (t => {
                const n = "string" != typeof t.data ? new Uint8Array(t.data) : t.data;
                if (57 === n[0]) return this.websocket.send(this.pong), this.resetPing();
                try {
                    !function(t, e) {
                        const n = t.options.encodeDecodeEngine ? t.options.encodeDecodeEngine.decode(e["#"][2]) : e["#"][2], s = {
                            e: () => t.events.emit(e["#"][1], n),
                            p: () => t.channels[e["#"][1]] && t.channels[e["#"][1]].onMessage(n),
                            s: {
                                c: () => {
                                    t.useBinary = n.binary, t.resetPing(n.ping), t.events.emit("connect");
                                }
                            }
                        };
                        "s" === e["#"][0] ? s[e["#"][0]][e["#"][1]] && s[e["#"][0]][e["#"][1]]() : s[e["#"][0]] && s[e["#"][0]]();
                    }(this, JSON.parse("string" == typeof n ? n : function(t) {
                        let e = "", n = 65535;
                        const s = t.length;
                        for (let i = 0; i < s; i += n) i + n > s && (n = s - i), e += String.fromCharCode.apply(null, t.subarray(i, i + n));
                        return e;
                    }(n)));
                } catch (t) {
                    return e(t);
                }
            }), this.websocket.onerror = (t => this.events.emit("error", t));
        }
    };
}(Socket);
