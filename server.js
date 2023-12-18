const express = require('express')
const app = express()

app.use(express.static(__dirname + '/public'))
app.set('view engine', 'ejs')

const { MongoClient } = require('mongodb')


let db
const url = 'mongodb+srv://ojspp000:asd123@cluster0.scxhjdy.mongodb.net/?retryWrites=true&w=majority'
new MongoClient(url).connect().then((client)=>{
  console.log('DB연결성공')
  db = client.db('forum')
  
}).catch((err)=>{
  console.log(err)
})


app.listen(8080, () => {
    console.log('http://localhost:8080 에서 서버 실행중')
})

app.get('/', (요청, 응답) => {
  응답.sendFile(__dirname + '/index.html')
}) 
app.get('/news', (요청, 응답) => {
  db.collection('post').insertOne({title : '안녕 유엠씨'})
}) 
app.get('/about', (요청, 응답) => {
  응답.send('나는 오준석이야')
})
app.get('/list', async (요청, 응답) =>{
  let result = await db.collection('post').find().toArray()
  응답.render('list.ejs',{post : result  ,data: new Date()})
})
