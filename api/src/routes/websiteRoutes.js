import express from "express";

const router = express.Router();

router.get('/', function(req, res){
    res.render('index');
});

router.get('/support', function(req, res){
    res.render('support');
});

router.get('/privacy', function(req, res){
    res.render('privacy');
});

export default router;