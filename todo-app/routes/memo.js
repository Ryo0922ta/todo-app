const { cache } = require('ejs');
const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();  //verbose()をつけるとデバックしやすくなる
const { promisify } = require('util');

// データベースオブジェクトの取得
const db = new sqlite3.Database('./db/booking_management.db');

// Promise 処理が終わったら結果を返します。という約束代わりに一旦渡しておくのがPromise
// `db.all()` を Promise ベースに変換
const dbAll = promisify(db.all).bind(db);

const dbGet = promisify(db.get).bind(db);
// SQLiteのクエリをPromiseでラップする関数
// クエリパラメータからゲットするapiは固定値で動くか調べるのアリ
function getMemoById(db, id) {
    const query = "SELECT * FROM memos WHERE id = ?";
    return dbGet(query, [id])
        .then(row => {
            console.log("getMemoById動いてます");
            console.log(row);
            return row; // 成功時は row を返す
        })
        .catch(err => {
            console.error(err);
            throw err; // エラー時は例外を投げる
        });
}

// prepareメソッドやrunメソッドをPromise化
// const prepareAsync = promisify(db.prepare).bind(db);

// 非同期処理は基本的には同期処理と違って上から順番に実行されることがない
// しかしPromiseベースで処理を記述することでその処理に対してawait をつけることができる
// つまりその処理が終わらないと次に進まないので、実行手順がコード順となり可読性に繋がる

// next はエラーハンドリングなどを定義する時に使うパラメータ
// 勘違いしそうになるがこの’/’はあらかじめ定義されたルーターの末尾を示している
// 今回は　var memoRouter = require('./routes/memo');
// つまり router.get('/') が示すパスは http://localhost:3000/memo/ である。
// タスク一覧
router.get('/', async function (req, res, next) {
    try {
        // 非同期でSQL文を実行
        const rows = await dbAll("SELECT * FROM memos");

        const data = {
            title: 'To Do メモ 一覧表示',
            content: rows //DataBaseから返された全レコードがrowsに配列で入ります
        };

        // json形式でレスポンスを返す
        res.json({ data });
    } catch (error) {

        // エラーハンドリング
        next(error); // エラーが発生した場合、次のミドルウェアにエラーを渡す
    }
});
// タスク追加
router.post('/submit/', async function (req, res, next) {
    try {
        const requestBody = req.body;
        console.log(requestBody);
        const memotext = requestBody.text;
        console.log(memotext);
        // prepareメソッドで実行したいクエリを準備する
        // ここをpromiseペースにしていたからエラーが起きていた。まじか
        const stmt = db.prepare("INSERT INTO memos (text) VALUES(?)");
        if (!stmt) {
            throw new Error("ステートメントの生成に失敗しました。");
        }
        const runAsync = promisify(stmt.run).bind(stmt);
        const finalizeAsync = promisify(stmt.finalize).bind(stmt);
        // ステートメントの run メソッドを実行
        await runAsync(memotext);
        // ステートメントを閉じる
        // inalizeもPromiseベースにしたい場合は以下のようにできます。
        await finalizeAsync();

        // json形式でレスポンスを返す
        res.json(requestBody);
    } catch (error) {
        // エラーハンドリング
        console.error('Prepare Error:', error.message); // エラーメッセージを出力
        throw error; // エラーを再スローして次のミドルウェアに渡す
        // next(error); // エラーが発生した場合、次のミドルウェアにエラーを渡す
    }
});

// サーバーサイドAPIエンドポイント (Express)　　 http://localhost:3000/memo/edit/?id=
router.get('/edit/:id', async function (req, res, next) {

    const id = req.params.id;
    console.log(`ID:${id}`);
    try {
        const memo = await getMemoById(db, id);

        if (memo) {
            res.json(memo); // メモが見つかった場合、JSONで返す
        } else {
            res.status(404).json({ error: 'メモが見つかりませんでした' }); // メモが見つからなかった場合
        }
    } catch (error) {
        console.error('Prepare Error:', error.message); // エラーメッセージを出力
        throw error; // エラーを再スローして次のミドルウェアに渡す    
    }
});

router.get('/delete/:id', async function (req, res, next) {

    const id = req.params.id;
    console.log(`ID:${id}`);
    try {
        const memo = await getMemoById(db, id);

        if (memo) {
            res.json(memo); // メモが見つかった場合、JSONで返す
        } else {
            res.status(404).json({ error: 'メモが見つかりませんでした' }); // メモが見つからなかった場合
        }
    } catch (error) {
        console.error('Prepare Error:', error.message); // エラーメッセージを出力
        throw error; // エラーを再スローして次のミドルウェアに渡す    
    }
});


module.exports = router;


// Promiseとは
// Promiseの注意点
// 500エラーで８時間くらい消えた
// なんでもないことだった。
// デベロッパーツールでペイロード、プレビュー、レスポンスを確認して
// statementメソッドの結果がconst stmt にうまく返ってきてないことがわかった
// statmement メソッドがpromiseベースにしていてがそれをやめてそのままで実装した
// 上手く動作した
// コールバックを取らない関数をPromiseベースにしてしまっていたことが原因だった
// sqlite3モジュールでコールバックを取る関数は、db.all(),db.get(),db.run()である。
// db.all()は結果の全て、db.get()は結果の一行だけ