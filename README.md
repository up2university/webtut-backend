# Webtut backend

Nodejs server that implements an API for the webtut-frontend.

## INSTALL

to install run

```
npm install

```

## CONFIGURE

Create the "config.js" based on "config-dist.js" file and update the variables:

```javascript
var config = {

  environment : process.env.NODE_ENV || 'development',

  serverHostName: "{{ host }}",
  serverPort: {{ port }}
  httpsKey: "keys/{{ key file }}",
  httpsCrt: "keys/{{crt file }}"
  peerJSPath : "/webtut",
  database: {
    hostname: '{{ db_hostname }}',
    port:     {{ db_port }},
    user:     '{{ db_user }}',
    password: '{{ db_pass }}',
    database: 'webtut'
  },

  mail : {
    from : 'WebTUT Server <webtut@{{ host }}>' // sender address
  }

};

```

## RUN THE SERVER

```
node server.js &

```

To configure as a service, check out the **utils** folder.
