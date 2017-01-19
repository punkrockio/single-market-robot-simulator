'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.Simulation = exports.Log = undefined;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }(); // Copyright 2016 Paul Brewer, Economic and Financial Technology Consulting LLC                             
// This is open source software. The MIT License applies to this software.                                  
// see https://opensource.org/licenses/MIT or included License.md file

/* eslint no-console: "off", no-sync:"off", consistent-this:"off" */

/* 
 *  on the browser, the jspm package manager can be programmed to set the
 *  fs module to @empty with jspm install single-market-robot-simulator -o override.json
 *  where override.json looks like {"map": {"fs": "@empty" }}
 */

exports.agentRegister = agentRegister;

var _marketExampleContingent = require('market-example-contingent');

var MEC = _interopRequireWildcard(_marketExampleContingent);

var _marketAgents = require('market-agents');

var MarketAgents = _interopRequireWildcard(_marketAgents);

var _positiveNumberArray = require('positive-number-array');

var _positiveNumberArray2 = _interopRequireDefault(_positiveNumberArray);

var _fs = require('fs');

var fs = _interopRequireWildcard(_fs);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// remember to override in jspm dep configuration to empty

var Market = MEC.Market;
var Pool = MarketAgents.Pool;


var AgentFactoryWarehouse = {};

/**
 * create new agent of specified name and options
 * @param {string} name Name of agent registered in AgentFactoryWarehouse
 * @param {Object} options Agent options.
 * @return {Object} new Agent generated by calling requested constructor with options
 * @private
 */

function newAgentFactory(name, options) {
    return new AgentFactoryWarehouse[name](options);
}

/**
 * register new types of (customized) agents in AgentFactoryWarehouse for use in simulations
 * @param {Object} obj An object with agent type names for keys and constructor(options) functions for values 
 */

function agentRegister(obj) {
    Object.assign(AgentFactoryWarehouse, obj);
}

agentRegister(MarketAgents); // a bit overbroad but gets all of them

/**
 * Isomorphic javascript logger, logs data rows to memory for browser and test simulations, logs data rows to .csv disk files for node server-based simulations
 */

var Log = exports.Log = function () {

    /** 
     * Create Log with suggested file name in browser memory or on-disk in nodejs
     *
     * @param {string} fname Suggested file name
     */

    function Log(fname) {
        _classCallCheck(this, Log);

        /**
         * if true, uses nodejs fs calls
         * @type {boolean} this.useFS
         */

        this.useFS = false;
        try {
            this.useFS = typeof fname === 'string' && fs && fs.openSync && fs.writeSync && !fs.should;
        } catch (e) {} // eslint-disable-line no-empty
        if (this.useFS) {

            /**
             * log file descriptor from open call
             * @type {number} this.fd
             */

            this.fd = fs.openSync(fname, 'w');
        } else {

            /** 
             * data array for browser and test usage
             * @type {Array} this.data
             */

            this.data = [];
        }
    }

    /**
     * writes data to Log and sets .last
     * @param {Array|number|string} x data to write to Log's log file or memory
     * @return {Object} returns Log object, chainable
     */

    _createClass(Log, [{
        key: 'write',
        value: function write(x) {
            if (x === undefined) return;

            /**
             * last item written to log
             * @type {Object} this.last
             */

            this.last = x;

            if (this.useFS) {
                if (Array.isArray(x)) {
                    fs.writeSync(this.fd, x.join(",") + "\n");
                } else if (typeof x === 'number' || typeof x === 'string') {
                    fs.writeSync(this.fd, x + "\n");
                } else {
                    fs.writeSync(this.fd, JSON.stringify(x) + "\n");
                }
            } else {
                this.data.push(x);
            }
            return this;
        }

        /**
         * sets header row and writes it to Log for csv-style Log. 
         * @param {string[]} x Header array giving names of columns for future writes
         * @return {Object} Returns this Log; chainable
         */

    }, {
        key: 'setHeader',
        value: function setHeader(x) {
            if (Array.isArray(x)) {

                /**
                 * header array for Log, as set by setHeader(header)
                 * @type {string[]}
                 */

                this.header = x;

                this.write(x);
            }
            return this;
        }

        /**
         * last value for some column recorded in Log 
         * @return {number|string|undefined} value from last write at column position matching header for given key
         */

    }, {
        key: 'lastByKey',
        value: function lastByKey(k) {
            if (this.header && this.header.length && this.last && this.last.length) {
                return this.last[this.header.indexOf(k)];
            }
        }
    }]);

    return Log;
}();

/**
 * single-market-robot-simulation Simulation 
 */

var Simulation = exports.Simulation = function () {

    /**
     * Create Simulation with given configuration
     * @param {Object} config
     * @param {number} config.periods number of periods in this simulation
     * @param {number} config.periodDuration duration of each period
     * @param {string[]} config.buyerAgentType string array (choose from "ZIAgent","UnitAgent","OneupmanshipAgent","KaplanSniperAgent" or types registered with agentRegister()) giving a rotation of types of agents to use when creating the buyer agents.
     * @param {string[]} config.sellerAgentType string array (choose from "ZIAgent","UnitAgent","OneupmanshipAgent","KaplanSniperAgent" or types registered with agentRegister()) giving a rotation of types of agents to use when creating the seller agents.
     * @param {number[]} [config.buyerRate=1.0] poisson arrival rate in wakes/sec for each buyer agent, defaults to 1.0 for all agents
     * @param {number[]} [config.sellerRate=1.0] poisson arrival rate in wakes/sec for each seller agent, defaults to 1.0 for all agents
     * @param {number[]} config.buyerValues Numeric array giving aggregate market demand for X. Becomes agents' values for units. Each period a new set of these values is distributed among buyer agents.
     * @param {number[]} config.sellerCosts Numeric array giving aggregate market supply for X. Becomes agents' costs for units.  Each period a new set of these costs is distributed among seller agents.
     * @param {number} [config.numberOfBuyers] number of buyers; if unprovided, assigns 1 buyer per entry in .buyerValues
     * @param {number} [config.numberOfSellers] number of sellers; if unprovided, assigns 1 seller per entry in .sellerCosts
     * @param {Object} config.xMarket configuration options for x Market forwarded to market-example-contingent constructor
     * @param {boolean} [config.integer] Set true if agent prices should be integers. Sent to agent constructor. Used by some random agents, such as ZIAgent.
     * @param {boolean} [config.ignoreBudgetConstraint] Set true if agents should ignore their values/costs and pretend they have maximum value or minimum cost.  Sent to agent constructors.
     * @param {boolean} [config.keepPreviousOrders] Set true if agents should not set cancelReplace flag on orders
     * @param {number} config.L Minimum suggested agent price.  Sets .minPrice in agent constructor options
     * @param {number} config.H Maximum suggested agent price.  Sets .maxPrice in agent constructor options
     * @param {boolean} [config.silent] If true, suppress console.log messages providing total number of agents, etc.
     * @param {boolean} [config.withoutOrderLogs] If true, suppreses buyorderlog and sellorderlog
     */

    function Simulation(config) {
        _classCallCheck(this, Simulation);

        /**
         * copy of config as passed to constructor
         * @type {Object} this.config
         */

        this.config = config;

        this.initLogs();
        this.initMarket();
        this.initAgents();

        /**
         * current period number when running simulation
         * @type {number} this.period
         */

        this.period = 0;

        /**
         * trade prices for current period
         * @type {number[]} this.periodTradePrices
         */

        this.periodTradePrices = [];

        /* istanbul ignore if */

        if (!this.config.silent) {
            console.log("duration of each period = " + this.periodDuration);
            console.log(" ");
            console.log("Number of Buyers  = " + this.numberOfBuyers);
            console.log("Number of Sellers = " + this.numberOfSellers);
            console.log("Total Number of Agents  = " + this.numberOfAgents);
            console.log(" ");
            console.log("minPrice = " + this.config.L);
            console.log("maxPrice = " + this.config.H);
        }
    }

    /**
     * initialize simulation data logging. 
     * called automatically by constructor
     * @private
     */

    _createClass(Simulation, [{
        key: 'initLogs',
        value: function initLogs() {
            var sim = this;
            sim.logs = {};
            var orderHeader = ['period', 't', 'tp', 'id', 'x', 'buyLimitPrice', 'value', 'sellLimitPrice', 'cost'];
            var headers = {
                ohlc: ['period', 'open', 'high', 'low', 'close'],
                buyorder: orderHeader,
                sellorder: orderHeader,
                rejectbuyorder: orderHeader,
                rejectsellorder: orderHeader,
                trade: ['period', 't', 'tp', 'price', 'buyerAgentId', 'buyerValue', 'buyerProfit', 'sellerAgentId', 'sellerCost', 'sellerProfit'],
                volume: ['period', 'volume'],
                effalloc: ['period', 'efficiencyOfAllocation']
            };

            var allLogs = ['trade', 'buyorder', 'sellorder', 'rejectbuyorder', 'rejectsellorder', 'profit', 'ohlc', 'volume', 'effalloc'];

            var withoutOrderLogs = allLogs.filter(function (s) {
                return s.indexOf('order') === -1;
            });

            var actualLogs = sim.config.withoutOrderLogs ? withoutOrderLogs : allLogs;

            actualLogs.forEach(function (name) {
                sim.logs[name] = new Log("./" + name + ".csv").setHeader(headers[name]);
            });
        }

        /** 
         * Initalize single market for trading X in Simulation
         * called by constructor
         * @private
         */

    }, {
        key: 'initMarket',
        value: function initMarket() {
            var sim = this;
            var xDefaults = {
                goods: "X",
                money: "money"
            };
            sim.xMarket = new Market(Object.assign({}, xDefaults, sim.config.xMarket));
            sim.xMarket.on('trade', function (tradespec) {
                sim.logTrade(tradespec);
                sim.pool.trade(tradespec);
            });
            if (!sim.config.withoutOrderLogs) {
                sim.xMarket.on('preorder', function (myorder) {
                    sim.logOrder('', myorder);
                });
                sim.xMarket.on('reject', function (myorder) {
                    sim.logOrder('reject', myorder);
                });
            }
        }

        /**
         * Initialize agents in simulation
         * called by constructor
         * @private
         */

    }, {
        key: 'initAgents',
        value: function initAgents() {
            var sim = this;
            var config = sim.config;
            sim.pool = new Pool();
            sim.buyersPool = new Pool();
            sim.sellersPool = new Pool();
            sim.numberOfBuyers = config.numberOfBuyers || config.buyerValues.length;
            sim.numberOfSellers = config.numberOfSellers || config.sellerCosts.length;
            config.buyerRate = (0, _positiveNumberArray2.default)(config.buyerRate) || [1];
            config.sellerRate = (0, _positiveNumberArray2.default)(config.sellerRate) || [1];
            if (!sim.numberOfBuyers || !sim.numberOfSellers) throw new Error("single-market-robot-simulation: can not determine numberOfBuyers and/or numberOfSellers ");
            sim.numberOfAgents = sim.numberOfBuyers + sim.numberOfSellers;
            var common = {
                integer: config.integer,
                ignoreBudgetConstraint: config.ignoreBudgetConstraint,
                period: { number: 0, equalDuration: true, duration: config.periodDuration || 1000, init: { inventory: { X: 0, money: 0 } } },
                minPrice: config.L,
                maxPrice: config.H
            };
            sim.periodDuration = common.period.duration;
            for (var i = 0, l = sim.numberOfBuyers; i < l; ++i) {
                var a = sim.newBuyerAgent(i, common);
                sim.buyersPool.push(a);
                sim.pool.push(a);
            }
            for (var _i = 0, _l = sim.numberOfSellers; _i < _l; ++_i) {
                var _a = sim.newSellerAgent(_i, common);
                sim.sellersPool.push(_a);
                sim.pool.push(_a);
            }
            sim.buyersPool.distribute('values', 'X', config.buyerValues);
            sim.sellersPool.distribute('costs', 'X', config.sellerCosts);
        }

        /**
         * Create a new Buyer agent for the simulation
         * called by initAgents() for each buyer
         * @param {number} i counter for agents 0,1,2,...
         * @param {Object} common Settings to send to agent constructor
         * @private
         */

    }, {
        key: 'newBuyerAgent',
        value: function newBuyerAgent(i, common) {
            var sim = this;
            var lType = sim.config.buyerAgentType.length;
            var lRate = sim.config.buyerRate.length;
            var a = newAgentFactory(sim.config.buyerAgentType[i % lType], Object.assign({}, common, { rate: sim.config.buyerRate[i % lRate] }));
            sim.teachAgent(a);
            return a;
        }

        /**
         * Create a new Seller agent for the simulation
         * called by initAgents() for each seller
         * @param {number} i counter for agents 0,1,2,...
         * @param {Object} common Settings to send to agent constructor
         * @private
         */

    }, {
        key: 'newSellerAgent',
        value: function newSellerAgent(i, common) {
            var sim = this;
            var lType = sim.config.sellerAgentType.length;
            var lRate = sim.config.sellerRate.length;
            var a = newAgentFactory(sim.config.sellerAgentType[i % lType], Object.assign({}, common, { rate: sim.config.sellerRate[i % lRate] }));
            sim.teachAgent(a);
            return a;
        }

        /**
         * teach an agent tasks such as how to send buy and sell orders to market, how to find "Juicy" price for KaplanSniperAgent, etc.
         * called for each agent in newBuyerAgent() or newSellerAgent()
         * @param {Object} A a new agent that needs to learn the task methods
         * @private
         */

    }, {
        key: 'teachAgent',
        value: function teachAgent(A) {
            var sim = this;
            A.bid = function (market, price) {
                var order = MEC.oa({
                    t: this.wakeTime,
                    id: this.id,
                    cancel: !sim.config.keepPreviousOrders,
                    q: 1,
                    buyPrice: price
                });
                if (market.goods === 'X') {
                    market.submit(order);
                    while (market.process()) {} // eslint-disable-line no-empty
                }
            };

            A.ask = function (market, price) {
                var order = MEC.oa({
                    t: this.wakeTime,
                    id: this.id,
                    cancel: !sim.config.keepPreviousOrders,
                    q: 1,
                    sellPrice: price
                });
                if (market.goods === 'X') {
                    market.submit(order);
                    while (market.process()) {}
                }
            };

            A.markets = [sim.xMarket];

            if (A instanceof MarketAgents.KaplanSniperAgent) {
                A.getJuicyBidPrice = function () {
                    if (sim.logs && sim.logs.ohlc) return sim.logs.ohlc.lastByKey('high');
                };
                A.getJuicyAskPrice = function () {
                    if (sim.logs && sim.logs.ohlc) return sim.logs.ohlc.lastByKey('low');
                };
            }
        }

        /**
         * runs a periods of the simulation
         * @param {boolean} sync true indicates call is synchronous, return value will be simulation object; false indicates async, return value is Promise
         * @return {Promise<Object,Error>} Resolves to simulation object when one period of simulation is complete.
         */

    }, {
        key: 'runPeriod',
        value: function runPeriod(sync) {
            var sim = this;
            function atEndOfPeriod() {
                sim.pool.endPeriod();
                sim.logPeriod();
                return sim;
            }
            sim.period++;

            /* istanbul ignore if */

            if (!sim.config.silent) console.log("period: " + sim.period);

            sim.pool.initPeriod(sim.period);
            sim.xMarket.clear();

            if (sync) {
                sim.pool.syncRun(sim.pool.endTime());
                return atEndOfPeriod();
            }
            if (!sim.config.realtime) {
                return sim.pool.runAsPromise(sim.pool.endTime(), 10).then(atEndOfPeriod);
            }
            return new Promise(function (resolve, reject) {
                function onRealtimeWake(endTime) {
                    if (!endTime) return reject("period endTime required for onRealtimeWake, got: " + endTime);
                    return function () {
                        var now = Date.now() / 1000.0 - sim.realtime;
                        if (now >= endTime) {
                            clearInterval(sim.realtimeIntervalId);
                            delete sim.realtimeIntervalId;
                            sim.pool.syncRun(endTime);
                            return resolve(atEndOfPeriod());
                        }
                        sim.pool.syncRun(now);
                    };
                }

                if (sim.realtimeIntervalId) {
                    clearInterval(sim.realtimeIntervalId);
                    return reject("sim has unexpected realtimeIntervalId");
                }

                /* adjust realtime offset */

                sim.realtime = Date.now() / 1000.0 - sim.pool.agents[0].period.startTime;

                /* run asynchronously, and in realtime, endTime() is called immediately and onRealtimeWake(...) returns actual handler function */

                sim.realtimeIntervalId = setInterval(onRealtimeWake(sim.pool.endTime()), 40);
            });
        }

        /** 
         * Calculate simple maxGainsFromTrade() from simulation configuration buyerValues and sellerCosts
         * by sorting buyers' units high value first, and sellers' costs low value first, and adding profitable pairs
         * Slice and sort first to be robust against values/costs being unsorted. 
         * This is currently used only for logging purposes.  No market or agent behavior should typically depend on this function. 
         * @private
         */

    }, {
        key: 'getMaximumPossibleGainsFromTrade',
        value: function getMaximumPossibleGainsFromTrade() {
            var sim = this;
            if (sim.maximumPossibleGainsFromTrade) return sim.maximumPossibleGainsFromTrade;
            var result = 0;
            if (Array.isArray(sim.config.buyerValues) && Array.isArray(sim.config.sellerCosts)) {
                var buyerV = sim.config.buyerValues.slice().sort(function (a, b) {
                    return +b - a;
                });
                var sellerC = sim.config.sellerCosts.slice().sort(function (a, b) {
                    return +a - b;
                });
                var i = 0;
                var l = Math.min(buyerV.length, sellerC.length);
                while (i < l && buyerV[i] > sellerC[i]) {
                    result += buyerV[i] - sellerC[i];
                    ++i;
                }
            }
            sim.maximumPossibleGainsFromTrade = result;
            return result;
        }

        /**
         * Perform end-of-period simulation logging of profits, open/high/low/close trade prices, etc.
         * called automatically
         * @private
         */

    }, {
        key: 'logPeriod',
        value: function logPeriod() {
            var sim = this;
            var finalMoney = sim.pool.agents.map(function (A) {
                return A.inventory.money;
            });
            function ohlc() {
                if (sim.periodTradePrices.length > 0) {
                    var o = sim.periodTradePrices[0];
                    var c = sim.periodTradePrices[sim.periodTradePrices.length - 1];
                    var h = Math.max.apply(Math, _toConsumableArray(sim.periodTradePrices));
                    var l = Math.min.apply(Math, _toConsumableArray(sim.periodTradePrices));
                    return [sim.period, o, h, l, c];
                }
            }
            if (sim.logs.profit) sim.logs.profit.write(finalMoney);
            if (sim.logs.ohlc) sim.logs.ohlc.write(ohlc());
            if (sim.logs.volume) sim.logs.volume.write([sim.period, sim.periodTradePrices.length]);
            if (sim.logs.effalloc) {
                var finalMoneySum = 0.0;
                for (var i = 0, l = finalMoney.length; i < l; ++i) {
                    finalMoneySum += finalMoney[i];
                }var maxPossible = sim.getMaximumPossibleGainsFromTrade();
                if (maxPossible > 0) sim.logs.effalloc.write([sim.period, 100 * (finalMoneySum / maxPossible)]);
            }
            sim.periodTradePrices = [];
        }

        /**
         * called to log each compliant order
         *
         * @private
         */

    }, {
        key: 'logOrder',
        value: function logOrder(prefix, orderArray) {
            var sim = this;
            var order = MEC.ao(orderArray);
            var agent = sim.pool.agentsById[order.id];
            var buyLog = prefix + 'buyorder';
            var sellLog = prefix + 'sellorder';
            if (agent && order.buyPrice && sim.logs[buyLog]) {
                sim.logs[buyLog].write([sim.period, order.t, order.t - sim.period * sim.periodDuration, order.id, agent.inventory.X, order.buyPrice, agent.unitValueFunction('X', agent.inventory), '', '']);
            }
            if (agent && order.sellPrice && sim.logs[sellLog]) {
                sim.logs[sellLog].write([sim.period, order.t, order.t - sim.period * sim.periodDuration, order.id, agent.inventory.X, '', '', order.sellPrice, agent.unitCostFunction('X', agent.inventory)]);
            }
        }

        /**
         * called to log each trade in simulation
         * @private
         */

    }, {
        key: 'logTrade',
        value: function logTrade(tradespec) {
            var sim = this;
            var idCol = sim.xMarket.o.idCol;

            /* istanbul ignore if */

            if (idCol === undefined) throw new Error("Simulation.prototype.logTrade: sim.xMarket.o.idCol is undefined");
            // this is only sufficient for single unit trades
            if (tradespec.totalQ !== 1 || tradespec.buyA.length !== 1 || tradespec.sellA.length !== 1) throw new Error("Simulation.prototype.logTrade: single unit trades required, got: " + tradespec.totalQ);
            var buyerid = sim.xMarket.a[tradespec.buyA[0]][idCol];

            /* istanbul ignore if */

            if (buyerid === undefined) throw new Error("Simulation.prototype.logTrade: buyerid is undefined, tradespec=" + JSON.stringify(tradespec));
            var sellerid = sim.xMarket.a[tradespec.sellA[0]][idCol];

            /* istanbul ignore if */

            if (sellerid === undefined) throw new Error("Simulation.prototype.logTrade: sellerid is undefined, tradespec=" + JSON.stringify(tradespec));
            var tradePrice = tradespec.prices[0];
            if (!tradePrice) throw new Error("Simulation.prototype.logTrade: undefined price in trade ");
            var tradeBuyerValue = sim.pool.agentsById[buyerid].unitValueFunction('X', sim.pool.agentsById[buyerid].inventory);
            var tradeBuyerProfit = tradeBuyerValue - tradePrice;
            var tradeSellerCost = sim.pool.agentsById[sellerid].unitCostFunction('X', sim.pool.agentsById[sellerid].inventory);
            var tradeSellerProfit = tradePrice - tradeSellerCost;
            var tradeOutput = [sim.period, tradespec.t, tradespec.t - sim.period * sim.periodDuration, tradePrice, buyerid, tradeBuyerValue, tradeBuyerProfit, sellerid, tradeSellerCost, tradeSellerProfit];
            sim.periodTradePrices.push(tradePrice);
            if (sim.logs.trade) sim.logs.trade.write(tradeOutput);
        }

        /**
         * run simulation
         * @param {Object} [options]
         * @param {boolean} [options.sync=false] true to run synchronously, returns simulation object (not a Promise) 
         * @param {function(sim:Object)} [options.update]  update Optional end of period function
         * @param {number} [options.delay=20] delay timeout between periods in ms.
         * @return {Promise<Object,Error>} resolves to simulation object
         */

    }, {
        key: 'run',
        value: function run() {
            var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : { sync: false, update: function update(s) {
                    return s;
                }, delay: 20 },
                sync = _ref.sync,
                update = _ref.update,
                delay = _ref.delay;

            var sim = this;
            var config = this.config;

            /* istanbul ignore if */

            if (!config.silent) console.log("Periods = " + config.periods);

            if (sync) {
                while (sim.period < config.periods) {
                    sim.runPeriod({ sync: true });
                    if (typeof update === 'function') update(sim);
                }

                /* istanbul ignore if */

                if (!config.silent) console.log("done");

                return sim;
            }

            return new Promise(function (resolve, reject) {
                function loop() {
                    sim.runPeriod().then(update).then(function (s) {
                        return s.period < config.periods ? setTimeout(loop, delay) : resolve(s);
                    }, function (e) {
                        return reject(e);
                    });
                }
                loop();
            });
        }
    }]);

    return Simulation;
}();

/* the next comment tells the coverage tester that the main() function is not tested by the test suite */
/* istanbul ignore next */

function main() {

    /**
     * in stand-alone mode, read simulation config from ./config.json and run simulation synchronously, outputting log files in .csv format
     */

    /* suggested by Krumia's http://stackoverflow.com/users/1461424/krumia */
    /* posting at http://stackoverflow.com/a/25710749/103081 */

    function mainPeriod(sim) {
        fs.writeFileSync('./period', sim.period);
    }
    var config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));

    new Simulation(config).run({ sync: true, update: mainPeriod });
}

if ((typeof module === 'undefined' ? 'undefined' : _typeof(module)) === 'object') {

    /* istanbul ignore if */

    if (require && require.main === module) main();
}
