const express = require('express')
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const methodOverride = require('method-override')
const bcrypt = require('bcrypt') 
const app = express()
app.use(methodOverride('_method'))
app.use(express.static(__dirname + '/public'))
app.set('view engine','ejs')
app.use(express.json())
app.use(express.urlencoded({extended:true})) 
const { MongoClient } = require('mongodb')
const { ObjectId } = require('mongodb') 

const session = require('express-session')
const passport = require('passport')
const LocalStrategy = require('passport-local')
const MongoStore = require('connect-mongo')

require('dotenv').config() 

app.use(passport.initialize())
app.use(session({
  secret: 'asd123',
  resave : false,
  saveUninitialized : false,
  cookie : { maxAge : 60 * 60 * 1000 },
  store: MongoStore.create({
    mongoUrl : process.env.DB_URL,
    dbName: 'forum',
  })
}))
app.use('/list', (요청, 응답,next)=>{
  next()
})
function idcheck (요청, 응답, next){
  if (요청.body.username == '' || 요청.body.password == '') {
    응답.send('그러지마세요')
  } else {
    next()
  }
} 

app.use(passport.session()) 

const { S3Client } = require('@aws-sdk/client-s3')
const multer = require('multer')
const multerS3 = require('multer-s3')
const s3 = new S3Client({
  region : 'ap-northeast-2',
  credentials : {
      accessKeyId : process.env.S3_KEY,
      secretAccessKey : process.env.S3_SERCRET,
  }
})
const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: 'umcedun67',
    key: function (요청, file, cb) {
      cb(null, Date.now().toString()) //업로드시 파일명 변경가능
    }
  })
})
passport.use(new LocalStrategy(async (입력한아이디, 입력한비번, cb) => {
  let result = await db.collection('user').findOne({ username : 입력한아이디})
  if (!result) {
    return cb(null, false, { message: '아이디 DB에 없음' })
  }
  if (result.password == 입력한비번) {
    return cb(null, result)
  } else {
    return cb(null, false, { message: '비번불일치' });
  }
}))

passport.serializeUser((user, done) => {
  process.nextTick(() => {
    done(null, { id: user._id, username: user.username })
  })
})

passport.deserializeUser(async(user, done) => {
  let result = await db.collection('user').findOne({_id : new ObjectId(user.id) })
  delete result.password
  process.nextTick(() => {
    return done(null, result)
  })
})
let connectDB = require('./database.js')
let db
connectDB.then((client)=>{
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


app.get('/list', async (요청, 응답) => {
  let result = await db.collection('post').find().toArray()
  응답.render('list.ejs', { post: result, user: 요청.user })
})

app.get('/write', (요청, 응답) => {
  응답.render('write.ejs')
})

app.post('/add', upload.single('img1'),async (요청, 응답)=>{
  await db.collection('post').insertOne({ title : 요청.body.title, content : 요청.body.content ,img : 요청.file ? 요청.file.location : '',user : 요청.user._id,
  username : 요청.user.username})
  응답.redirect('/list')
}) 

app.get('/detail/:id',async (요청, 응답) => {
  try{
    console.log(요청.params)
    let result =await db.collection('post').findOne({_id : new ObjectId(요청.params.id)}) 
    let result2 = await db.collection('comment').find({ par_Id : new ObjectId(요청.params.id) }).toArray()
    응답.render('detail.ejs', {result : result, result2 : result2})
  }catch(e){
    console.log(e)
    응답.send("잘못했어 안했어 !!")
  }
})

app.get('/edit/:id', async (요청, 응답) => {
  try {
    const re = await db.collection('post').findOne({
      $and: [
        { _id: new ObjectId(요청.params.id) },
        { user: new ObjectId(요청.user._id) }
      ]
    });

    if (re) {
      // 조건에 맞는 문서를 찾았을 경우
      응답.render('edit.ejs', { re: re});
    } else {
      // 조건에 맞는 문서를 찾지 못했을 경우
      응답.status(404).send('해당 게시글은 다른 사용자의 게시글입니다');
    }
  } catch (error) {
    // 에러가 발생했을 경우
    console.error(error);
    응답.status(500).send('서버 에러: ' + error.message);
  }
});


app.post('/clear',upload.single('img1') ,async (요청, 응답) => {
  try {
    const result = await db.collection('post').updateOne(
      { _id: new ObjectId(요청.body.id) },
      { $set: { title : 요청.body.title, content : 요청.body.content ,img : 요청.file ? 요청.file.location : '',user : 요청.user._id,
      username : 요청.user.username}} 
    );

    if (result.modifiedCount === 1) {
      // 수정이 성공적으로 이루어진 경우
      응답.redirect('/list');
    } else {
      alert("다른 사람이 쓴걸 건들지 마 시발롬아")
    }
  } catch (error) {
    // 에러가 발생했을 경우
    console.error(error);
    응답.status(500).send('서버 에러: ' + error.message);
  }
});

app.delete('/delete', async (요청, 응답) => {
  try {
    console.log(요청.query.docid);
    
    const result = await db.collection('post').deleteOne({ 
      _id: new ObjectId(요청.query.docid), 
      user: new ObjectId(요청.user._id) 
    });

    if (result.deletedCount === 1) {
      // 삭제가 성공했을 경우
      응답.send('삭제완료');
    } else {
      // 삭제가 실패했을 경우
      throw new Error('삭제 실패: 해당 문서를 찾을 수 없거나 권한이 없습니다.');
    }
  } catch (error) {
    // 에러가 발생했을 경우
    console.error(error);
    응답.status(500).send('서버 에러: ' + error.message);
  }
});


app.get('/list/:id', async (요청, 응답) => {
  
  let result = await db.collection('post').find()
    .skip( (요청.params.id - 1) * 5 ).limit(5).toArray() 
  응답.render('list.ejs', { post : result,user: 요청.user})
}) 

app.get('/list/next/:id', async (요청, 응답) => {
  let result = await db.collection('post').find({_id : {$gt : new ObjectId(요청.params.id) }}).limit(5).toArray()
  응답.render('list.ejs', { post : result ,user: 요청.user })
}) 
app.get('/login', (요청, 응답)=>{
  응답.render('login.ejs')
}) 
app.post('/login', async (요청, 응답, next) => {
  passport.authenticate('local', (error, user, info) => {
      if (error) return 응답.status(500).json(error)
      if (!user) return 응답.status(401).json(info.message)
      요청.logIn(user, (err) => {
        if (err) return next(err)
        응답.redirect('/list')
      })
  })(요청, 응답, next)

}) 
app.get('/register',(요청,응답) => {
  응답.render('register.ejs')
})

app.post('/register',idcheck,async(요청,응답) => {
  await db.collection('user').insertOne({
    username : 요청.body.username,
    password : 요청.body.password
  })
  응답.redirect('/')
})

app.use('/shop', require('./routes/shop.js') ) 
app.use('/board/sub', require('./routes/board.js') ) 



app.get('/search', async (요청, 응답) => {
  let 검색조건 = [
    {$search : {
      index : 'title_index',
      text : { query : 요청.query.val, path : 'title' }
    }}
  ]
  let result = await db.collection('post').aggregate(검색조건).toArray()
  응답.render('search.ejs', { post : result })
}) 

// app.get('/comment/:id', (요청, 응답) => {
  
//   응답.render('comment.ejs',{par_id : 요청.params.id})
// })
// app.post('/comm/:id',async (요청, 응답)=>{
//   await db.collection('comment').insertOne({ comment : 요청.body.comment , par_id :요청.params.id})
//   응답.redirect('/list')
// }) 
// app.get('/commentshow/:id',async (요청, 응답) => {
//   let comment = await db.collection('comment').find({par_id : 요청.params.id}).toArray();
//   응답.render('commentshow.ejs', { post: comment});
// })

app.post('/comment', async (요청, 응답)=>{
  let result = await db.collection('comment').insertOne({
    content : 요청.body.content,
    writerId : new ObjectId(요청.user._id),
    writer : 요청.user.username,
    par_Id : new ObjectId(요청.body.parentId)
  })
  응답.redirect('back')
}) 



app.post('/chat', async (요청, 응답)=>{
  let result = await db.collection('chat').insertOne({
    writerId : new ObjectId(요청.user._id),
    writer : 요청.user.username,
    par_Id : new ObjectId(요청.body.parentId),
    parentname : 요청.body.par_name
  })
  응답.redirect('/chat/categories')
}) 


app.get('/chat/categories', async (요청, 응답) => {
  let result = await db.collection('chat').find({ writerId: 요청.user._id }).toArray()
  응답.render('chat.ejs', { post: result, user: 요청.user })
})
