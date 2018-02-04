
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
    from : 'WebTUT Server <webtut@{{ host }}>', // sender address
    to : 'Your support Team email <support@example.com>' // recipient address
  }
  
};

module.exports = config;
