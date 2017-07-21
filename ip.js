/** ****************************************************************************************************
 * File: ip
 * @author Julian Jensen <jjdanois@gmail.com> on 12/15/16
 * @version 1.0.0
 *******************************************************************************************************/
'use strict';
// @formatter:off

const
    empty = [ 0, 0, 0, 0, 0, 0, 0, 0 ],
    ip4number = ip => ip.split( '.' ).reduce( ( addr, d ) => ( addr << 8 ) + Number( d ), 0 ) >>> 0,

    _IPv4 = [
      '0.0.0.0/8',
      '10.0.0.0/8',
      '100.64.0.0/10',
      '127.0.0.0/8',
      '169.254.0.0/16',
      '172.16.0.0/12',
      '192.0.0.0/24',
      '192.0.2.0/24',
      '192.168.0.0/16',
      '198.18.0.0/15',
      '198.51.100.0/24',
      '203.0.113.0/24',
      '224.0.0.0/4',
      '240.0.0.0/4',
      '255.255.255.255/32'
    ],
    _reservedIPv6 = [
      '::/128',
      '::1/128',
      '::ffff:0:0/96',
      '::/96',
      '100::/64',
      '2001:10::/28',
      '2001:db8::/32',
      'fc00::/7',
      'fe80::/10',
      'fec0::/10',
      'ff00::/8'
    ],
    _IPv6to4 = [
      '2002::/24',
      '2002:a00::/24',
      '2002:7f00::/24',
      '2002:a9fe::/32',
      '2002:ac10::/28',
      '2002:c000::/40',
      '2002:c000:200::/40',
      '2002:c0a8::/32',
      '2002:c612::/31',
      '2002:c633:6400::/40',
      '2002:cb00:7100::/40',
      '2002:e000::/20',
      '2002:f000::/20',
      '2002:ffff:ffff::/48'
    ],
    _IPv6Teredo = [
      '2001::/40',
      '2001:0:a00::/40',
      '2001:0:7f00::/40',
      '2001:0:a9fe::/48',
      '2001:0:ac10::/44',
      '2001:0:c000::/56',
      '2001:0:c000:200::/56',
      '2001:0:c0a8::/48',
      '2001:0:c612::/47',
      '2001:0:c633:6400::/56',
      '2001:0:cb00:7100::/56',
      '2001:0:e000::/36',
      '2001:0:f000::/36',
      '2001:0:ffff:ffff::/64'
    ],
    _IPv6 = [ ..._reservedIPv6, ..._IPv6to4, ..._IPv6Teredo ],
    _IPv6Exception = 'ff0e::/16';


/* eslint-disable max-len */
/**
 *
 * | Address block (CIDR) | Range                         | Number of addresses | Scope           | Purpose                                                                                                                                                                      |
 * | ---                  | ---                           | ---                 | ---             | ---                                                                                                                                                                          |
 * | 0.0.0.0/8            | 0.0.0.0 – 0.255.255.255       | 16,777,216          | Software        | Used for broadcast messages to the current ("this")[1]                                                                                                                       |
 * | 10.0.0.0/8           | 10.0.0.0 – 10.255.255.255     | 16,777,216          | Private network | Used for local communications within a private network[2]                                                                                                                    |
 * | 100.64.0.0/10        | 100.64.0.0 – 100.127.255.255  | 4,194,304           | Private network | Used for communications between a service provider and its subscribers when using a carrier-grade NAT[3]                                                                     |
 * | 127.0.0.0/8          | 127.0.0.0 – 127.255.255.255   | 16,777,216          | Host            | Used for loopback addresses to the local host[4]                                                                                                                             |
 * | 169.254.0.0/16       | 169.254.0.0 – 169.254.255.255 | 65,536              | Subnet          | Used for link-local addresses between two hosts on a single link when no IP address is otherwise specified, such as would have normally been retrieved from a DHCP server[5] |
 * | 172.16.0.0/12        | 172.16.0.0 – 172.31.255.255   | 1,048,576           | Private network | Used for local communications within a private network[2]                                                                                                                    |
 * | 192.0.0.0/24         | 192.0.0.0 – 192.0.0.255       | 256                 | Private network | Used for the IANA IPv4 Special Purpose Address Registry[6]                                                                                                                   |
 * | 192.0.2.0/24         | 192.0.2.0 – 192.0.2.255       | 256                 | Documentation   | Assigned as "TEST-NET" for use in documentation and examples. It should not be used publicly.[7]                                                                             |
 * | 192.88.99.0/24       | 192.88.99.0 – 192.88.99.255   | 256                 | Internet        | Used by 6to4 anycast relays[8]                                                                                                                                               |
 * | 192.168.0.0/16       | 192.168.0.0 – 192.168.255.255 | 65,536              | Private network | Used for local communications within a private network[2]                                                                                                                    |
 * | 198.18.0.0/15        | 198.18.0.0 – 198.19.255.255   | 131,072             | Private network | Used for testing of inter-network communications between two separate subnets[9]                                                                                             |
 * | 198.51.100.0/24      | 198.51.100.0 – 198.51.100.255 | 256                 | Documentation   | Assigned as "TEST-NET-2" for use in documentation and examples. It should not be used publicly.[7]                                                                           |
 * | 203.0.113.0/24       | 203.0.113.0 – 203.0.113.255   | 256                 | Documentation   | Assigned as "TEST-NET-3" for use in documentation and examples. It should not be used publicly.[7]                                                                           |
 * | 224.0.0.0/4          | 224.0.0.0 – 239.255.255.255   | 268,435,455         | Internet        | Reserved for muticast[10]                                                                                                                                                    |
 * | 240.0.0.0/4          | 240.0.0.0 – 255.255.255.254   | 268,435,455         | Internet        | Reserved for future use[11]                                                                                                                                                  |
 * | 255.255.255.255/32   | 255.255.255.255               | 1                   | Subnet          | Reserved for the "limited broadcast" destination address[11]                                                                                                                 |
 *
 */
/* eslint-enable max-len */

/**
 *
 * @param {string} ipaddr
 * @return {number}
 */
function prefix_from_subnet_mask( ipaddr )
{
    let bits2prefix = { 255: 8, 254: 7, 252: 6, 248: 5, 240: 4, 224: 3, 192: 2, 128: 1, 0: 0 };

    return bits2prefix[ ipaddr[ 0 ] ] + bits2prefix[ ipaddr[ 1 ] ] + bits2prefix[ ipaddr[ 2 ] ] + bits2prefix[ ipaddr[ 3 ] ];
}

/**
 *
 * @param {string} ipv4
 * @return {{sIPv4: *, nIPv4, aIPv4: Array, subnetMask: number, netMasked: number, normalized: *, subnetSize: number, shift: number, reverseShift: number}}
 */
function parse_ipv4( ipv4 )
{
    let shift = 0,
        mask = 0xffffffff;

    if ( typeof ipv4 !== 'string' || ipv4.length < 7 )
        throw new Error( 'Bad IPv4 format' );

    if ( ipv4.indexOf( '/' ) !== -1 )
    {
        let parts = ipv4.split( '/' );

        ipv4 = parts[ 0 ];
        shift = parseInt( parts[ 1 ] );

        mask = 0xffffffff << ( 32 - parseInt( mask ) );
    }

    let nipv4 = ip4number( ipv4 ),
        inv = 32 - shift;

    return {
        sIPv4: ipv4,
        nIPv4: nipv4,
        aIPv4: ipv4.split( '.' ).map( p => parseInt( p, p[ 0 ] === '0' ? 8 : 10 ) ),
        subnetMask: mask,
        netMasked: nipv4 & mask,
        normalized: nipv4 >>> inv,
        subnetSize: 1 << inv,
        shift,
        reverseShift: inv
    };
}

/**
 *
 * @param {string} sIP
 * @return {boolean}
 */
function private_ip( sIP )
{
    if ( typeof sIP !== 'string' || sIP.length < 7 ) return false;

    if ( sIP.startsWith( '::ffff:' ) )
        sIP = sIP.substr( 7 );

    let ip = ip4number( sIP ),
        s;

    // 255.255.255.255/32
    if ( ip === 0xffffffff ) return true;

    // 240.0.0.0/4
    // 224.0.0.0/4
    if ( ( ip & 0xf0000000 ) >= 0xe0000000 ) return true;

    s = ip >>> 8;

    // 203.0.113.0/24
    // 198.51.100.0/24
    // 192.88.99.0/24
    // 192.0.2.0/24
    // 192.0.0.0/24
    if ( s === 0xcb0071 || s === 0xc63364 || s === 0xc05863 || s === 0xc00002 || s === 0xc00000 ) return true;

    s >>>= 8;

    // 192.168.0.0/16
    // 169.254.0.0/16
    if ( s === 0xc0a8 || s === 0xa9fe ) return true;

    s >>>= 1;

    // 198.18.0.0/15
    if ( s === 0x6309 ) return true;

    s >>>= 3;

    // 172.16.0.0/12
    if ( s === 0xac1 ) return true;

    s >>>= 2;

    // 100.64.0.0/10
    if ( s === 0x191 ) return true;

    s >>>= 2;

    // 127.0.0.0/8
    // 10.0.0.0/8
    // 0.0.0.0/8
    return s === 127 || s === 10 || !s;
}

/**
 *
 * @param {string} ipv6
 */
function parse_ipv6( ipv6 )
{
    let ip6;

    if ( typeof ipv6 !== 'string' || ipv6.length < 2 || ipv6.indexOf( '::' ) !== ipv6.lastIndexOf( '::' ) )
        throw new Error( 'Bad IPv6 format input' );

    if ( ipv6 === '::' )
        ip6 = empty.slice();
    else
    {
        if ( ipv6.startsWith( '::' ) ) ipv6 = '0' + ipv6;
        else if ( ipv6.endsWith( '::' ) ) ipv6 += '0';

        ip6 = ipv6.split( ':' ).map( p => p ? parseInt( p, ( p[ 0 ] === '0' ? 8 : 16 ) ) : null );

        let packed = ip6.indexOf( null );

        if ( packed !== -1 ) ip6 = [ ...ip6.slice( 0, packed ), ...empty.slice( 0, 9 - ip6.length ), ...ip6.slice( packed ) ];
    }
}

module.exports = {
    private_ip, parse_ipv4, parse_ipv6, prefix_from_subnet_mask
};
