/** ****************************************************************************************************
 * File: logger-service
 * @author Julian Jensen <jjdanois@gmail.com> on 9/8/16
 * @version 2.4.6
 *******************************************************************************************************/
'use strict';

const
    CONTENT_LENGTH = Symbol( 'hidden_content_length' ),
    DEFAULT_BUFFER_DURATION = 1000,

    style = require( 'ansi-styles' ),
    onFinished = require( 'on-finished' ),
    onHeaders  = require( 'on-headers' ),
    os = require( 'os' ),
    hostname = os.hostname(),
    isPrivate = require( './ip' ).private_ip,
    actualRemotesHeaders = [ 'x-forwarded-for', 'forwarded-for', 'forwarded', 'x-client-ip', 'x-real-ip', 'client-ip', 'real-ip', 'x-forwarded', 'cluster-client-ip', 'remote-addr' ],
    pretty = v => Array.isArray( v ) ? v.join( ', ' ) : v,
    deep = ( o, f ) => f.split( '.' ).reduce( ( cur, key ) => cur ? cur[ key ] : null, o ),
    CLF_MONTH = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ],
    contentLength = o => !o || !o.headers || !o.headers[ 'content-length' ] ? o[ CONTENT_LENGTH ] || 0 : o.headers[ 'content-length' ],
    logLevelNames = [
        'ALL',
        'TRACE',
        'DEBUG',
        'INFO',
        'WARN',
        'ERROR',
        'FATAL',
        'MARK',
        'OFF'
    ],
    missingError = 'no response or no error in res.LOG_ERROR',
    logLevels = {},
    _tokens = {},
    _formats = {},
    getip = req => {
        let m, rh,
            avoidPrivate,
            snip = a => a,
            check = ra => typeof ra === 'string' && ( m = ra.match( /^.*?(\d+)\.(\d+)\.(\d+)\.(\d+)|::1$/ ) );

        for ( const addrName of actualRemotesHeaders )
        {
            rh = req.headers[ addrName ];

            if ( typeof rh !== 'string' || !( m = rh.match( /^.*?(\d+)\.(\d+)\.(\d+)\.(\d+)$/ ) ) ) continue;

            if ( isPrivate( m[ 1 ] ) )
            {
                if ( avoidPrivate ) continue;
                avoidPrivate = rh;
            }
            else
                return snip( rh );
        }

        if ( check( req.ip ) )
        {
            if ( !isPrivate( m[ 1 ] ) ) return snip( req.ip );
            if ( !avoidPrivate ) avoidPrivate = req.ip;
        }

        rh = req.connection && req.connection.remoteAddress;

        if ( check( rh ) )
        {
            if ( !isPrivate( m[ 1 ] ) ) return snip( rh );
            if ( !avoidPrivate ) avoidPrivate = rh;
        }

        return snip( avoidPrivate );
    };

/**
 * @method all
 * @memberof Logger#
 */
/**
 * @method trace
 * @memberof Logger#
 */
/**
 * @method debug
 * @memberof Logger#
 */
/**
 * @method info
 * @memberof Logger#
 */
/**
 * @method warn
 * @memberof Logger#
 */
/**
 * @method error
 * @memberof Logger#
 */
/**
 * @method fatal
 * @memberof Logger#
 */
/**
 * @method mark
 * @memberof Logger#
 */
/**
 * @class Logger
 */
class Logger
{
    /**
     *
     */
    constructor()
    {
        /** @type {number} */
        this._level = logLevelNames.indexOf( 'INFO' );
        this.logFormat = 'direct';

        this._LOG_ERROR = Symbol( "For attaching the error object" );

        /**
         * Standard request logging format.
         */
        this.format( "standard", ":on:date[iso] [:level] [:auth] [:status]:off - :request[baseUrl] | :method :url" );
        // this.format( "mmm", ":on:date[iso] [:level] [:auth] [:status]:off - :res[content-length] bytes | :response-time[3] ms | :method :url" );
        /**
         * Standard direct logging format.
         */
        this.format( "direct", ":note:date[iso] [:level]:off - :msg" );
        /**
         * Apache combined log format.
         */
        this.format( 'combined', ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"' );

        /**
         * Apache common log format.
         */
        this.format( 'common', ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length]' );

        /**
         * Default format.
         */
        this.format( 'default', ':remote-addr - :remote-user [:date] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"' );

        /**
         * Short format.
         */
        this.format( 'short', ':remote-addr :remote-user :method :url HTTP/:http-version :status :res[content-length] - :response-time ms' );

        /**
         * Tiny format.
         */
        this.format( 'tiny', ':method :url :status :res[content-length] - :response-time ms' );

        /**
         * dev (colored)
         */
        this.format( 'dev', function developmentFormatLine( tokens, req, res ) {
            // get the status code if response written
            const
                status = res._header ? res.statusCode : undefined;

            // get colored function
            let fn = developmentFormatLine[ status || 'undef' ];

            if ( !fn )
            {
                // compile
                fn = developmentFormatLine[ status || 'undef' ] =
                    this.compile( style.reset.open + ':method :url ' + this.colored( status ).open + ':status ' + this.colored( status ).close + style.reset.open + ':response-time ms - :res[content-length]' + style.reset.open );
            }

            return fn( tokens, req, res );
        } );


        this.token( 'response-time', ( req, res, digits )   => res._startAt && ( res._startAt[ 0 ] * 1e3 + res._startAt[ 1 ] * 1e-6 ).toFixed( typeof digits !== 'number' ? 3 : digits ) );
        this.token( 'url',          req                     => req.originalUrl || req.url );
        this.token( 'method',       req                     => req.method );
        this.token( 'date',         ( req, res, format )    => format === 'clf' ? this.clfdate( new Date() ) : format === 'web' ? new Date().toUTCString() : new Date().toISOString() );
        this.token( 'note',         ()                      => style.cyan.open );
        this.token( 'on',           ( req, res )            => res.headersSent ? this.colored( res.statusCode ).open : '' );
        this.token( 'off',          ( req, res )            => res.headersSent ? style.reset.open : '' );
        this.token( 'status',       ( req, res )            => res.headersSent && String( res.statusCode ) );
        this.token( 'referrer',     req                     => req.headers[ 'referer' ] || req.headers[ 'referrer' ] );
        this.token( 'remote-addr',                             getip );
        this.token( 'remote-user',  req                     => req.locals && req.locals.requestData && req.locals.requestData.userData && req.locals.requestData.userData.userName );
        this.token( 'http-version', req                     => req.httpVersionMajor + '.' + req.httpVersionMinor );
        this.token( 'user-agent',   req                     => req.headers[ 'user-agent' ] );

        this.token( 'req',          ( req, res, field )     => pretty( field === 'content-length' ? contentLength( req ) : req.headers[ field.toLowerCase() ] ) );
        this.token( 'res',          ( req, res, field )     => res.headersSent ? pretty( field === 'content-length' ? contentLength( res ) : res.getHeader( field ) ) : '' );

        this.token( 'request',      ( req, res, field )     => pretty( deep( req, field ) ) );
        this.token( 'response',     ( req, res, field )     => pretty( deep( res, field ) ) );
        this.token( 'error',        ( req, res, field )     => {
            let err = res && res[ this.LOG_ERROR ];

            if ( err )
            {
                if ( field === 'message' && typeof this.prettyErrors === 'function' )
                    return this.prettyErrors( err );
                else
                    return err[ field ];
            }
            else if ( field === 'stack' )
                return new Error( missingError ).stack;

            return missingError;
        } );

        this.ready = false;
    }

    /**
     * @return {Symbol}
     */
    get LOG_ERROR()
    {
        return this._LOG_ERROR;
    }

    /**
     *
     * @param {number} status
     * @return {string}
     */
    colored( status )
    {
        const color = status >= 500 ? style.red // red
                    : status >= 400 ? style.yellow // yellow
                    : status >= 300 ? style.cyan // cyan
                    : status >= 200 ? style.green // green
                    : style.white; // no color

        return color;
        // return '\x1b[' + color + ';1m';
    }

    /**
     * Format a Date in the common log format.
     *
     * @private
     * @param {Date} dateTime
     * @return {string}
     */
    clfdate( dateTime )
    {
        const
            date  = dateTime.getUTCDate(),
            hour  = dateTime.getUTCHours(),
            mins  = dateTime.getUTCMinutes(),
            secs  = dateTime.getUTCSeconds(),
            year  = dateTime.getUTCFullYear(),
            month = CLF_MONTH[ dateTime.getUTCMonth() ];

        return `${pad2( date )}/${month}/${year}:${pad2( hour )}:${pad2( mins )}:${pad2( secs )} +0000`;
    }

    /**
     * Compile a format string into a function.
     *
     * @param {Array<string?Array<string>>} format
     * @return {function}
     * @public
     */
    compile( format )
    {
        if ( !Array.isArray( format ) )
            throw new TypeError( 'argument format must be a string' );

        return function( ignore, req, res ) {

            return format.reduce( ( str, piece ) => {
                                      if ( typeof piece === 'string' )
                                          return str + piece;
                                      else if ( piece.length === 1 )
                                          return str + ( _tokens[ piece[ 0 ] ]( req, res ) || '' );
                                      else
                                          return str + ( _tokens[ piece[ 0 ] ]( req, res, piece[ 1 ] ) || '' );
                                  }, '' );
        };
    }

    /**
     * Define a token function with the given name, and callback fn(req, res).
     *
     * @param {string} name
     * @param {function} fn
     * @public
     */
    token( name, fn )
    {
        _tokens[ name ] = fn;
        return this;
    }

    /**
     * Sets the log level to use.
     *
     * @param {string} logLevel - The log level to use.
     */
    set level( logLevel )
    {
        this._level = typeof logLevel === 'string' ? logLevelNames.indexOf( logLevel ) : logLevel;
    }

    /**
     * Gets the log level to use.
     * @return {string} The log level to use.
     */
    get level()
    {
        return logLevelNames[ this._level ];
    }

    /**
     *
     * @param {string|number} level
     * @param {string} msg
     */
    log( level, msg )
    {
        const
            reqLevel = typeof level === 'string' ? logLevelNames.indexOf( level ) : level;

        if ( reqLevel < this._level ) return;

        const
            prev  = _tokens.msg,
            prevLevel = _tokens.level;

        _tokens.msg = () => typeof msg === 'string' ? msg : ( ( msg instanceof Error && typeof this.prettyErrors === 'function' ) ? this.prettyErrors( msg ) : ( msg.message || msg.name || 'no message found' ) );
        _tokens.level = () => logLevelNames[ reqLevel ];

        const
            line = this.getFormatFunction( this.logFormat )( _tokens, { headers: {} }, {} );

        if ( line !== null )
        {
            if ( this.options && this.options.stream ) this.options.stream.write( line.trim() + '\n' );
            else
                console.log( line.trim() );
        }

        _tokens.msg = prev;
        _tokens.level = prevLevel;

        if ( process.env.NODE_ENV === 'development' && ( level === 'FATAL' || level === 'ERROR' ) )
            console.trace();
    }

    /**
     * @typedef {object} LoggerOptions
     * @property {string} [logLevel='TRACE']        - Minimum log level to actually output
     * @property {string} [logFormat='mmmdirect']    - The format to use for direct log statements, i.e. log.info( 'Blah' )
     * @property {object<string, string>} [formats] - An object with keys being the format name and the string value the template
     * @property {object<string, function>} [tokens] - Additional user token definitions
     * @property {object} [stream=process.stdout]   - Stream to write to
     * @property {string} [useFormat='mmm']          - The default loggin format for requests
     * @property {boolean} [immediate=false]        - Output log message upon request received rather than on the response
     */

    /**
     * @param {Express|object} app
     * @param {object} [options]
     */
    init( app, options )
    {
        const
            defaultOpts = {
                logLevel: "TRACE",
                logFormat: "mmmdirect",
                stream: process.stdout,
                useFormat: 'default'
            };

        if ( arguments.length === 1 && typeof app.use !== 'function' )
        {
            options = app;
            app = null;
        }

        let opts = this.options = options ? Object.assign( {}, defaultOpts, options ) : defaultOpts;

        if ( opts.prettyErrors )
            this.prettyErrors = opts.prettyErrors;

        this.token( 'auth', () => '' );
        this.token( 'host', () => hostname );
        this.token( 'level', () => typeof this._level === 'string' ? this._level : logLevelNames[ this._level ] );
        this.token( 'env', () => process.env.NODE_ENV );
        this.token( 'msg', ( req, res ) => res[ this.LOG_ERROR ] ? res[ this.LOG_ERROR ].message : '' );

        if ( typeof opts.tokens === 'object' ) Object.keys( opts.tokens ).forEach( tokenName => this.token( tokenName, opts.tokens[ tokenName ] ) );

        if ( typeof opts.formats === 'object' ) Object.keys( opts.formats ).forEach( formatName => this.format( formatName, opts.formats[ formatName ] ) );

        this.logFormat = opts.logFormat || 'combined';
        this.level = opts.logLevel || Logger.TRACE;
        if ( app ) this.hook( app );
        this.ready = true;
    }

    /**
     * Define a format with the given name.
     *
     * @param {string} name
     * @param {string|function} fmt
     * @public
     */
    format( name, fmt )
    {
        if ( typeof fmt !== 'string' )
        {
            _formats[ name ] = fmt;
            return this;
        }
        // _formats[ name ] = fmt.split( /(:[-\w]{2,})(?:\[([^\]]+)])?/ ).filter( s => !!s );
        _formats[ name ] = fmt.split( /(:[-\w]{2,}(?:\[[^\]]+])?)/ )
                              .filter( s => !!s )
                              .map( s => {
                                  if ( s[ 0 ] !== ':' ) return s;
                                  const m = s.match( /:([-\w]{2,})(?:\[([^\]]+)])?/ );

                                  return m[ 2 ] ? [ m[ 1 ], m[ 2 ] ] : [ m[ 1 ] ];
                              } );

        return this;
    }

    /**
     * Lookup and compile a named format function.
     *
     * @param {string} name
     * @return {function}
     * @public
     */
    getFormatFunction( name )
    {
        // lookup format
        const
            fmt = _formats[ name ] || name || this.defaultFormat;

        // return compiled format
        return typeof fmt !== 'function' ? this.compile( fmt ) : fmt;
    }

    /**
     *
     * @param {express} app
     */
    hook( app )
    {
        app.use( middleware.call( this,  this.options.useFormat, this.options ) );

        this.ready = true;
    }
}

/**
 * Create a logger middleware.
 *
 * @public
 * @param {String|Function} format
 * @param {Object} [options]
 * @return {Function} middleware
 */
function middleware( format, options = {} )
{
    let fmt  = format,
        opts = options;

    if ( fmt === undefined )
    {
        console.error( 'undefined logging format: specify a format' );
        process.exit( 1 );
    }

    const
        // output on request instead of response
        immediate = opts.immediate,

        // check if log entry should be skipped
        skip = opts.skip || false,

        getFormatFunc = name => this.getFormatFunction( name ),

        // format function
        formatLine = typeof fmt !== 'function' ? this.getFormatFunction( fmt ) : fmt,

        // stream
        buffer = opts.buffer;

    let stream = opts.stream || process.stdout;

    // swap the stream
    if ( buffer )
        stream = createBufferStream( stream, typeof buffer !== 'number' ? DEFAULT_BUFFER_DURATION : buffer );

    return function( req, res, next )
    {
        /** @type {function} */
        let end        = res.end,
            write      = res.write;

        res[ CONTENT_LENGTH ] = req[ CONTENT_LENGTH ] = 0;

        req.on( 'data', chunk => req[ CONTENT_LENGTH ] += chunk.length );

        res.write = function( ...args )
        {
            let payload = args[ 0 ];

            if ( payload ) res[ CONTENT_LENGTH ] += Buffer.byteLength( payload.toString(), 'utf8' );

            write.call( res, ...args );
        };

        res.end = function( ...args )
        {
            let payload = args[ 0 ];

            if ( payload ) res[ CONTENT_LENGTH ] += Buffer.byteLength( payload.toString(), 'utf8' );

            end.call( res, ...args );
        };

        // request data
        req._startAt       = process.hrtime();
        req._remoteAddress = req.ip || req._remoteAddress || ( req.connection && req.connection.remoteAddress );

        // response data
        res._startAt   = undefined;

        if ( typeof opts.requestCallback === 'function' )
            opts.requestCallback( 'request', req );

        // noinspection JSAnnotator
        /**
         */
        function logRequest()
        {
            if ( skip !== false && skip( req, res ) ) return;

            let line,
                method = 'unknown',
                url = req.route ? req.route.stack.map( layer => ( method = layer.method ) + ':' ).join( '' ) + req.route.path : null;

            let src = res.statusCode && String( res.statusCode );

            if ( !res._startAt ) res._startAt = process.hrtime( req._startAt );

            if ( typeof opts.requestCallback === 'function' )
            {
                opts.requestCallback( 'response', {
                    verb: method,
                    url: req.route ? req.route.path : 'unknown',
                    statusCode: src || 'unknown',
                    time: res._startAt,
                    si: contentLength( req ),
                    so: contentLength( res )
                } );
            }

            if ( res._header && res.statusCode && _formats[ src ] )
                line = getFormatFunc( src )( _tokens, req, res );
            else if ( url && _formats[ url + ':' + src ] )
                line = getFormatFunc( url + ':' + src )( _tokens, req, res );
            else if ( url && _formats[ url ] === null )
                line = null;
            else if ( url && _formats[ url ] )
                line = getFormatFunc( url )( _tokens, req, res );
            else
                line = formatLine( _tokens, req, res );

            if ( line !== null )
            {
                if ( typeof opts.requestCallback === 'function' )
                    opts.requestCallback( 'logs', line );

                stream.write( line + '\n' );
            }
        }

        if ( immediate )
            logRequest();
        else
        {
            // record response start
            onHeaders( res, () => res._startAt = process.hrtime( req._startAt ) );

            // log when response finished
            onFinished( res, logRequest );
        }

        next();
    };
}

/**
 * Pad number to two digits.
 *
 * @private
 * @param {number} num
 * @return {string}
 */
function pad2( num )
{
    const str = String( num );

    return str.length !== 1 ? str : '0' + str;
}

/**
 * Create a basic buffering stream.
 *
 * @param {object} stream
 * @param {number} interval
 * @public
 */
function createBufferStream( stream, interval )
{
    const
        buf = [];

    let timer = null;

    // noinspection JSAnnotator
    /**
     */
    function flush()
    {
        timer = null;
        stream.write( buf.join( '' ) );
        buf.length = 0;
    }

    /**
     * @param {string} str
     */
    function write( str )
    {
        if ( timer === null )
            timer = setTimeout( flush, interval );

        buf.push( str );
    }

    return { write: write };
}

logLevelNames.forEach( ( lvl, value ) => {
    logLevels[ lvl ]   = value;
    logLevels[ value ] = lvl;
    Object.defineProperty( Logger, lvl, { get() { return lvl; } } );

    Logger.prototype[ lvl.toLowerCase() ] = msg => module.exports.log( lvl, msg );

} );

module.exports = new Logger();

Logger.LOG_ERROR = module.exports.LOG_ERROR;

