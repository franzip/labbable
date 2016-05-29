'use strict';

// Load modules

const Lab = require('lab');
const Code = require('code');
const Hapi = require('hapi');
const Labbable = require('..');

// Test shortcuts

const lab = exports.lab = Lab.script();
const describe = lab.describe;
const it = lab.it;
const expect = Code.expect;

const internals = {};

describe('Labbable', () => {

    it('hands-off server once initialized.', (done) => {

        const server = new Hapi.Server();
        server.connection();

        let init = false;
        server.ext('onPreStart', (srv, next) => {

            init = true;
            next();
        });

        const labbable = new Labbable();
        labbable.using(server);
        labbable.ready((err, srv) => {

            expect(err).to.not.exist();
            expect(init).to.equal(true);
            expect(srv).to.shallow.equal(server);
            done();
        });

        server.initialize((err) => err && done(err));
    });

    it('hands-off server that was already initialized.', (done) => {

        const server = new Hapi.Server();
        server.connection();

        const labbable = new Labbable();
        labbable.using(server);

        server.initialize((err) => {

            expect(err).to.not.exist();

            labbable.ready((err, srv) => {

                expect(err).to.not.exist();
                expect(srv).to.shallow.equal(server);
                done();
            });
        });

    });

    it('hands-off initialized server in a queue.', (done) => {

        const server = new Hapi.Server();
        server.connection();

        const labbable = new Labbable();
        labbable.using(server);

        const order = [];
        const add = (n) => {

            return (err, srv) => {

                expect(err).to.not.exist();
                expect(srv).to.shallow.equal(server);
                order.push(n);
            };
        };

        labbable.ready(add(1));
        labbable.ready(add(2));
        labbable.ready(add(3));

        server.initialize((err) => {

            expect(err).to.not.exist();

            labbable.ready(add(4));
            labbable.ready(add(5));
            labbable.ready((err, srv) => {

                expect(err).to.not.exist();
                expect(srv).to.shallow.equal(server);
                expect(order).to.equal([1,2,3,4,5]);
                done();
            });
        });

    });

    it('accepts server in constructor.', (done) => {

        const server = new Hapi.Server();
        server.connection();

        let init = false;
        server.ext('onPreStart', (srv, next) => {

            init = true;
            next();
        });

        const labbable = new Labbable(server);
        labbable.ready((err, srv) => {

            expect(err).to.not.exist();
            expect(init).to.equal(true);
            expect(srv).to.shallow.equal(server);
            done();
        });

        server.initialize((err) => err && done(err));
    });

    it('returns server init state with isInitialized().', (done) => {

        const server = new Hapi.Server();
        server.connection();

        const labbable = new Labbable();
        expect(labbable.isInitialized()).to.equal(false);

        labbable.using(server);
        expect(labbable.isInitialized()).to.equal(false);

        server.initialize((err) => {

            expect(err).to.not.exist();
            expect(labbable.isInitialized()).to.equal(true);
            done();
        });
    });

    it('respects timeout specified on ready() options (waiting for init).', (done) => {

        const server = new Hapi.Server();
        server.connection();

        const labbable = new Labbable(server);

        setTimeout(() => server.initialize(() => {}), 20);

        labbable.ready({ timeout: 10 }, (err, srv) => {

            expect(err).to.exist();
            expect(err.message).to.equal('Labbable timed-out after 10ms.  Did you forget to call server.initialize() or labbable.using(server)?');
            expect(srv).to.not.exist();
            done();
        });

    });

    it('hands-off server as soon as it\'s available when using ready({ immediate: true }).', (done) => {

        const server = new Hapi.Server();
        server.connection();

        const labbable = new Labbable();

        setImmediate(() => labbable.using(server));

        labbable.ready({ immediate: true }, (err, srv) => {

            expect(err).to.not.exist();
            expect(srv).to.shallow.equal(server);
            done();
        });

    });

    it('hands-off server that was already available when using ready({ immediate: true }).', (done) => {

        const server = new Hapi.Server();
        server.connection();

        const labbable = new Labbable(server);

        labbable.ready({ immediate: true }, (err, srv) => {

            expect(err).to.not.exist();
            expect(srv).to.shallow.equal(server);
            done();
        });

    });

    it('respects timeout specified on ready() options (waiting for immediate).', (done) => {

        const server = new Hapi.Server();
        server.connection();

        const labbable = new Labbable();

        setTimeout(() => labbable.using(server), 20);

        labbable.ready({ timeout: 10, immediate: true }, (err, srv) => {

            expect(err).to.exist();
            expect(err.message).to.equal('Labbable timed-out after 10ms.  Did you forget to call labbable.using(server)?');
            expect(srv).to.not.exist();
            done();
        });

    });

    it('has default ready() timeout of 2 seconds.', (done, onCleanup) => {

        const server = new Hapi.Server();
        server.connection();

        const labbable = new Labbable();

        const setTimeout = global.setTimeout;
        onCleanup((next) => {

            global.setTimeout = setTimeout;
            next();
        });

        const called = [];
        global.setTimeout = (fn, time) => {

            called.push(time);
            setTimeout(fn, 1);
        };

        labbable.ready({ immediate: true }, (err, srv) => {

            expect(err).to.exist();
            expect(err.message).to.equal('Labbable timed-out after 2000ms.  Did you forget to call labbable.using(server)?');
            expect(srv).to.not.exist();
            expect(called.length).to.equal(1);
            expect(called[0]).to.equal(2000);
            done();
        });

    });

    it('never times-out with ready({ timeout: false | 0 }).', (done, onCleanup) => {

        const server = new Hapi.Server();
        server.connection();

        const labbable = new Labbable();

        const setTimeout = global.setTimeout;
        onCleanup((next) => {

            global.setTimeout = setTimeout;
            next();
        });

        setTimeout(() => labbable.using(server), 10);

        const called = [];
        global.setTimeout = (fn, time) => {

            called.push(time);
            setTimeout(fn, 1);
        };

        let firstReadied = false;
        labbable.ready({ timeout: false, immediate: true }, (err, srv) => {

            expect(err).to.not.exist();
            expect(srv).to.shallow.equal(server);
            firstReadied = true;
        });

        labbable.ready({ timeout: 0, immediate: true }, (err, srv) => {

            expect(err).to.not.exist();
            expect(srv).to.shallow.equal(server);
            expect(called.length).to.equal(0);
            expect(firstReadied).to.equal(true);
            done();
        });

    });

    it('lets ready() timeout no-op once fulfilled.', (done) => {

        const server = new Hapi.Server();
        server.connection();

        const labbable = new Labbable();

        setImmediate(() => labbable.using(server));

        labbable.ready({ timeout: 10, immediate: true }, (err, srv) => {

            expect(err).to.not.exist();
            expect(srv).to.shallow.equal(server);

            // Let timeout complete and no-op
            setTimeout(done, 15);
        });

    });


    it('ready() sans callback returns a promise that eventually resolves.', (done) => {

        const server = new Hapi.Server();
        server.connection();

        const labbable = new Labbable();

        setImmediate(() => labbable.using(server));

        labbable.ready({ immediate: true })
        .then((srv) => {

            expect(srv).to.shallow.equal(server);
            done();
        })
        .catch(done);

    });

    it('ready() sans callback returns a promise that resolves immediately.', (done) => {

        const server = new Hapi.Server();
        server.connection();

        const labbable = new Labbable(server);

        labbable.ready({ immediate: true })
        .then((srv) => {

            expect(srv).to.shallow.equal(server);
            done();
        })
        .catch(done);

    });

    it('ready() sans callback returns a promise that eventually rejects on timeout.', (done) => {

        const server = new Hapi.Server();
        server.connection();

        const labbable = new Labbable();

        labbable.ready({ timeout: 1, immediate: true })
        .then(() => {

            done(new Error('Shouldn\'t make it here.'));
        })
        .catch((err) => {

            expect(err).to.exist();
            expect(err.message).to.equal('Labbable timed-out after 1ms.  Did you forget to call labbable.using(server)?');
            done();
        });

    });

    it('using() throws when called multiple times.', (done) => {

        const server = new Hapi.Server();
        server.connection();

        const labbable = new Labbable();

        labbable.using(server);

        expect(() => {

            labbable.using(server);
        }).to.throw('Can\'t call labbable.using(server) more than once.');

        done();
    });

    it('using() throws when called multiple times.', (done) => {

        const server = new Hapi.Server();
        server.connection();

        const labbable = new Labbable();

        labbable.using(server);

        expect(() => {

            labbable.using(server);
        }).to.throw('Can\'t call labbable.using(server) more than once.');

        done();
    });

    it('plugin provides server decorations for isInitialized() and ready().', (done) => {

        const server = new Hapi.Server();
        server.connection();

        server.register(Labbable.plugin, () => {});
        setImmediate(() => server.initialize(() => {}));

        expect(server.isInitialized()).to.equal(false);

        server.labbableReady((err, srv) => {

            expect(err).to.not.exist();
            expect(srv).to.shallow.equal(server);
            expect(srv.isInitialized()).to.equal(true);
            done();
        });
    });

});
