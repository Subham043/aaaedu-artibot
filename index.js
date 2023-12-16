require('dotenv').config()
const app = require('./app');
const port = process.env.PORT || 8099;


app.listen(port,()=>{
    console.log(`Apps is running on port: ${port}`);
})