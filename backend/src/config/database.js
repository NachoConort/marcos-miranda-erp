const mongoose = require('mongoose')

require("node:dns/promises").setServers(["1.1.1.1", "8.8.8.8"]);


const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI)
    console.log(`✅ MongoDB conectado: ${conn.connection.host}`)
  } catch (error) {
    console.error(`❌ Error conectando a MongoDB: ${error.message}`)
    process.exit(1)
  }
}

module.exports = connectDB
