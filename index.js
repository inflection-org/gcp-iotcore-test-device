const { readFileSync } = require('fs')
const mqtt = require('mqtt')
const jwt = require('jsonwebtoken')

const projectId = 'inflection-iot'
const deviceId = 'inf002'
const registryId = 'apple-home'
const region = 'asia-east1'
const algorithm = 'RS256'
const privateKeyFile = './rsa_private.pem'
const serverCertFile = './roots.pem'
const mqttBridgeHostname = 'mqtt.googleapis.com'
const mqttBridgePort = 8883
const messageType = 'events'
const mqttTopic = `/devices/${deviceId}/${messageType}`
const mqttClientId = `projects/${projectId}/locations/${region}/registries/${registryId}/devices/${deviceId}`

const createJwt = (projectId, privateKeyFile, algorithm) => {
  const token = {
    iat: parseInt(Date.now() / 1000),
    exp: parseInt(Date.now() / 1000) + 60 * 60, // 60 minutes
    aud: projectId,
  }
  const privateKey = readFileSync(privateKeyFile)
  return jwt.sign(token, privateKey, { algorithm })
}

const connectionArgs = {
  host: mqttBridgeHostname,
  port: mqttBridgePort,
  clientId: mqttClientId,
  username: 'unused',
  password: createJwt(projectId, privateKeyFile, algorithm),
  protocol: 'mqtts',
  secureProtocol: 'TLSv1_2_method',
  protocolVersion: 4,
  clean: true,
  ca: [readFileSync(serverCertFile)],
}

console.log('Connecting to server')
client = mqtt.connect(connectionArgs)

client.on('connect', (success) => {
  console.log('connect')
  if (!success) {
    console.log('Client not connected...')
    return
  }
  console.log('Client connected...')
  client.subscribe(`/devices/${deviceId}/config`, { qos: 1 })
  client.subscribe(`/devices/${deviceId}/commands/#`, { qos: 0 })
  client.subscribe(`/devices/${deviceId}/events/#`, { qos: 0 })
})

client.on('close', () => {
  console.log('close')
  process.exit(1)
})

client.on('error', (err) => {
  console.log('error', err)
  process.exit(1)
})

client.on('message', (topic, message, apple) => {
  console.log(apple)
  const data = Buffer.from(message, 'base64').toString('ascii')
  console.log(`message received: Topic - ${topic} --------- Messege: ${data}`)
  if (topic === `/devices/${deviceId}/commands/ping`) {
    publish('hello', 'ping')
  }
})

function publish(data, topic) {
  client.publish(`${mqttTopic}/${topic}`, data, { qos: 1 }, (err) => {
    if (err) {
      console.log('failed to publish')
      return
    }
    console.log('published successfully')
  })
}

// setTimeout(() => {
//   console.log('client disconnected...')
//   client.end()
// }, 5000)
