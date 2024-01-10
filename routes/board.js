const router = require('express').Router()
function idcheck (요청, 응답, next){
  if (요청.body.username == '' || 요청.body.password == '') {
    응답.send('그러지마세요')
  } else {
    next()
  }
} 
router.get('/sports', idcheck, (요청, 응답) => {
  응답.send('스포츠 게시판')
})
router.get('/game', idcheck, (요청, 응답) => {
  응답.send('게임 게시판')
}) 

module.exports = router 