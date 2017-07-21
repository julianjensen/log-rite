# logger-service

A basic logging module.

## Logging Options

| Type                     | Name      | Default        | Explanation                                                                 |
| :---                     | :---      | :---           | :---                                                                        |
| string                   | logLevel  | 'TRACE'        | Minimum log level to actually output                                        |
| string                   | logFormat | 'p3direct'     | The format to use for direct log statements, i.e. log.info( 'Blah' )        |
| object<string, string>   |           | formats        | An object with keys being the format name and the string value the template |
| object<string, function> |           | tokens         | Additional user token definitions                                           |
| object                   | stream    | process.stdout | Stream to write to                                                          |
| string                   | useFormat | 'p3'           | The default logging format for requests                                     |
| boolean                  | immediate | false          | Output log message upon request received rather than on the response        |


## Usage

For the simplest example:

```js
const
    log = require( 'logger-service' );

log.init( app );
```

To initialize first and then hook later:
```js
log.init( logOptions );
// ...
log.hook( app );
```

To use the `:auth` token, make the associated function return an appropriate string:
```js
logOptions.tokens.auth = req => req.session.userName + '@' + !!req.session.password;
```

You can also have different templates based on the response status code. The headers must have been started and a status code set
for this to work.
```js
logOptions.formats[ '200' ] = ':on:date[iso] [:auth]:off - Normal response with :res[content-length] bytes | :method :url' 
```
Now responses with status 200 will use that template while all other responses uses the default.

For error response, especially code 500, you can add the `Error` object to the response and use the special `:error` token
to dump additional information. You can use the `:error` token in any message provided an `Error` has been added to the response.
If no `Error` is present, you will some default information depending on the information your template calls for.
```js

logOptions.formats[ '500' ] = ':on:date[iso] [500]:off - :method :url | ERROR: :error[message]\n:error[stack]';

app.use( function( req, res, next ) {
    try {
        doSomethingThatMightThrow();
    }
    catch ( err )
    {
        res[ log.LOG_ERROR ] = err;
        res.status( 500 ).json( { "error": "Badness everywhere" } );
    }
} );
```
This will put the entry into the log with the error message on the first line and the stack trace on subsequent lines.

You can also set up templates based on routes. For example, to output special information when users authenticate, you can do this:
```js
logOptions.formats[ 'get:/user/authorization' ] = ":on:date[iso] [:level] [:auth] [:status] [:remote-addr]:off - Authentication of :req[p3-credentials], authCode => :res[p3-authcode] | :method :url";
```
Whenever the handler for the `GET` method for the URL `/user/authorization` gets executed, this special log template will
be used. It displays something like the following:
```
2016-11-16T00:46:24.621Z [TRACE] [master@true] [200] [::ffff:127.0.0.1] - Authentication of {"userName":"master","password":"master"}, authCode => gbc278a45296240b8a406c7840428d1ab | GET /user/authorization
```
You can also access any field of the `Request` and `Response` object using the tokens `:request` and `:response` respectively.
```js
logOptions.formats[ 'before-after' ] = ":request[path] matched :request[route.path], the method was :method";
```
which shows, for example:
```
/user/registration/57bb1f91c370324a94000085 matched /user/registration/:_id
```
All the tokens from `morgan` are still here plus a number of new ones. Below you will (one day, eventually) find a complete list.

