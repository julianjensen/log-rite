# logger-service

A basic logging module.

## Logging Options

| Type                     | Name      | Default        | Explanation                                                                 |
| :---                     | :---      | :---           | :---                                                                        |
| string                   | logLevel  | 'TRACE'        | Minimum log level to actually output                                        |
| string                   | logFormat | 'direct'       | The format to use for direct log statements, i.e. log.info( 'Blah' )        |
| object<string, string>   |           | formats        | An object with keys being the format name and the string value the template |
| object<string, function> |           | tokens         | Additional user token definitions                                           |
| object                   | stream    | process.stdout | Stream to write to                                                          |
| string                   | useFormat | 'standard'     | The default logging format for requests                                     |
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

| Address block (CIDR) | Range                         | Number of addresses | Scope           | Purpose                                                                                                                                                                             |
| ---                  | ---                           | ---                 | ---             | ---                                                                                                                                                                                 |
| 0.0.0.0/8            | 0.0.0.0 – 0.255.255.255       | 16,777,216          | Software        | Used for broadcast messages to the current ("this") [^1^](#_1)                                                                                                                      |
| 10.0.0.0/8           | 10.0.0.0 – 10.255.255.255     | 16,777,216          | Private network | Used for local communications within a private network[^2^](#_2)                                                                                                                    |
| 100.64.0.0/10        | 100.64.0.0 – 100.127.255.255  | 4,194,304           | Private network | Used for communications between a service provider and its subscribers when using a carrier-grade NAT[^3^](#_3)                                                                     |
| 127.0.0.0/8          | 127.0.0.0 – 127.255.255.255   | 16,777,216          | Host            | Used for loopback addresses to the local host[^4^](#_4)                                                                                                                             |
| 169.254.0.0/16       | 169.254.0.0 – 169.254.255.255 | 65,536              | Subnet          | Used for link-local addresses between two hosts on a single link when no IP address is otherwise specified, such as would have normally been retrieved from a DHCP server[^5^](#_5) |
| 172.16.0.0/12        | 172.16.0.0 – 172.31.255.255   | 1,048,576           | Private network | Used for local communications within a private network[^2^](#_2)                                                                                                                    |
| 192.0.0.0/24         | 192.0.0.0 – 192.0.0.255       | 256                 | Private network | Used for the IANA IPv4 Special Purpose Address Registry[^6^](#_6)                                                                                                                   |
| 192.0.2.0/24         | 192.0.2.0 – 192.0.2.255       | 256                 | Documentation   | Assigned as "TEST-NET" for use in documentation and examples. It should not be used publicly.[^7^](#_7)                                                                             |
| 192.88.99.0/24       | 192.88.99.0 – 192.88.99.255   | 256                 | Internet        | Used by 6to4 anycast relays[^8^](#_8)                                                                                                                                               |
| 192.168.0.0/16       | 192.168.0.0 – 192.168.255.255 | 65,536              | Private network | Used for local communications within a private network[^2^](#_2)                                                                                                                    |
| 198.18.0.0/15        | 198.18.0.0 – 198.19.255.255   | 131,072             | Private network | Used for testing of inter-network communications between two separate subnets[^9^](#_9)                                                                                             |
| 198.51.100.0/24      | 198.51.100.0 – 198.51.100.255 | 256                 | Documentation   | Assigned as "TEST-NET-2" for use in documentation and examples. It should not be used publicly.[^7^](#_7)                                                                           |
| 203.0.113.0/24       | 203.0.113.0 – 203.0.113.255   | 256                 | Documentation   | Assigned as "TEST-NET-3" for use in documentation and examples. It should not be used publicly.[^7^](#_7)                                                                           |
| 224.0.0.0/4          | 224.0.0.0 – 239.255.255.255   | 268,435,455         | Internet        | Reserved for muticast[^10^](#_10)                                                                                                                                                   |
| 240.0.0.0/4          | 240.0.0.0 – 255.255.255.254   | 268,435,455         | Internet        | Reserved for future use[^11^](#_11)                                                                                                                                                 |
| 255.255.255.255/32   | 255.255.255.255               | 1                   | Subnet          | Reserved for the "limited broadcast" destination address[^11^](#_11)                                                                                                                |
 



| Address block (CIDR) | Range                                               | Number of addresses | Scope                       | Purpose                                                 |
| ---                  | ---                                                 | ---                 | ---                         | ---                                                     |
| ::/128               | ::                                                  | 1                   | Software                    | Unspecified address                                     |
| ::1/128              | ::1                                                 | 1                   | Host                        | Loopback address to the local host.                     |
| ::ffff:0:0/96        | ::ffff:0.0.0.0 - ::ffff:255.255.255.255             | 2^32^               | Software                    | IPv4 mapped addresses                                   |
| 64:ff9b::/96         | 64:ff9b::0.0.0.0 - 64:ff9b::255.255.255.255         | 2^32^               | Global Internet[^12^](#_12) | IPv4/IPv6 translation (RFC 6052)                        |
| 100::/64             | 100:: - 100::ffff:ffff:ffff:ffff                    | 2^64^               |                             | Discard prefix RFC 6666                                 |
| 2001::/32            | 2001:: - 2001::ffff:ffff:ffff:ffff:ffff:ffff        | 2^96^               | Global                      | Teredo tunneling                                        |
| 2001:10::/28         | 2001:10:: - 2001:1f:ffff:ffff:ffff:ffff:ffff:ffff   | 2^100^              | Software                    | Deprecated (previously ORCHID)                          |
| 2001:20::/28         | 2001:20:: - 2001:2f:ffff:ffff:ffff:ffff:ffff:ffff   | 2^100^              | Software                    | ORCHIDv2                                                |
| 2001:db8::/32        | 2001:db8:: - 2001:db8:ffff:ffff:ffff:ffff:ffff:ffff | 2^96^               | Documentation               | Addresses used in documentation and example source code |
| 2002::/16            | 2002:: - 2002:ffff:ffff:ffff:ffff:ffff:ffff:ffff    | 2^112^              | Global Internet             | 6to4                                                    |
| fc00::/7             | fc00:: - fdff:ffff:ffff:ffff:ffff:ffff:ffff:ffff    | 2^121^              | Private network             | Unique local address                                    |
| fe80::/10            | fe80:: - febf:ffff:ffff:ffff:ffff:ffff:ffff:ffff    | 2^118^              | Link                        | Link-local address                                      |
| ff00::/8             | ff00:: - ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff    | 2^120^              | Global Internet             | Multicast address                                       |


<a name="_1" /> 1, Jump up ^ RFC 1700, Assigned Numbers (1994), page 4

<a name="_2" /> 2. RFC 1918, Address Allocation for Private Internets (1996)

<a name="_3" /> 3. RFC 6598, IANA-Reserved IPv4 Prefix for Shared Address Space (2012)

<a name="_4" /> 4. RFC 990, Assigned Numbers (1986)

<a name="_5" /> 5. RFC 3927, Dynamic Configuration of IPv4 Link-Local Addresses (2005)

<a name="_6" /> 6. RFC 5736, IANA IPv4 Special Purpose Address Registry (2010)

<a name="_7" /> 7. RFC 5737, IPv4 Address Blocks Reserved for Documentation (2010)

<a name="_8" /> 8. RFC 3068, An Anycast Prefix for 6to4 Relay Routers (2001)

<a name="_9" /> 9. RFC 2544, Benchmarking Methodology for Network Interconnect Devices (1999)

<a name="_10" /> 10. RFC 1112, Host Extensions for IP Multicasting (1989)

<a name="_11" /> 11. RFC 6890, Special-Purpose IP Address Registries (2013)

<a name="_12" /> 12. RFC 6052 section 3.2
