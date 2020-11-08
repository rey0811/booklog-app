/* jshint curly:true, debug:true */
/* globals $, firebase */

/**
 * -------------------
 * 星評価機能
 * -------------------
 */

// 書籍登録時
$('#add-book-star').raty({
  half: true,
  path: './images/',
  score: 0
});

/**
 * -------------------
 * 書籍一覧画面関連の関数
 * -------------------
 */

// 書籍の表紙画像をダウンロードする
const downloadBookImage = bookImageLocation => firebase
  .storage()
  .ref(bookImageLocation)
  .getDownloadURL() // book-images/abcdef のようなパスから画像のダウンロードURLを取得
  .catch((error) => {
    console.error('写真のダウンロードに失敗:', error);
  });

// 書籍の表紙画像を表示する
const displayBookImage = ($divTag, url) => {
  $divTag.find('.book-item__image').attr({
    src: url,
  });
};

// Realtime Database の books から書籍を削除する
const deleteBook = (bookId) => {
  firebase
  .database()
  .ref('books/'+bookId)
  .remove()
  .then(() => {
    // books から該当の書籍データを削除したとき
    console.log('該当の書籍データを削除しました');
  })
  .catch((error) => {
    // books から該当の書籍データを削除に失敗したとき
    console.log('該当の書籍データを削除に失敗しました');
  });
};

// 書籍の表示用のdiv（jQueryオブジェクト）を作って返す
const createBookDiv = (bookId, bookData) => {
  // HTML内のテンプレートからコピーを作成する
  const $divTag = $('#book-template > .book-item').clone();

  // 書籍タイトルを表示する
  $divTag.find('.book-item__title').text(bookData.bookTitle);

  // おすすめ度を表示する
  // $divTag.find('.book-item__star').data('raty').score(bookData.bookStar);
  // let $bookItemStar = $divTag.find('.book-item__star');
  
  $divTag.find('.book-item__star').raty({
    half: true,
    path: './images/',
    score:bookData.bookStar,
    readOnly: true
  });

  // setBookStar($bookItemStar,bookData.bookStar);
  // $bookItemStar.data('raty').score(bookData.bookStar);

  // 書籍の表紙画像をダウンロードして表示する
  downloadBookImage(bookData.bookImageLocation).then((url) => {
    displayBookImage($divTag, url);
  });

  // id属性をセット
  $divTag.attr('id', `book-id-${bookId}`);

  // 削除ボタンのイベントハンドラを登録
  const $deleteButton = $divTag.find('.book-item__delete');
  $deleteButton.on('click', () => {
    deleteBook(bookId);
  });

  return $divTag;
};

// 書籍一覧画面内の書籍データをクリア
const resetBookshelfView = () => {
  $('#book-list').empty();
};

// 書籍一覧画面に書籍データを表示する
const addBook = (bookId, bookData) => {
  const $divTag = createBookDiv(bookId, bookData);
  $divTag.appendTo('#book-list');
};

// 書籍一覧画面の初期化、イベントハンドラ登録処理
const loadBookshelfView = () => {
  resetBookshelfView();

  // 書籍データを取得
  const booksRef = firebase
    .database()
    .ref('books')
    .orderByChild('createdAt');

  // 過去に登録したイベントハンドラを削除
  booksRef.off('child_removed');
  booksRef.off('child_added');

  // books の child_removedイベントハンドラを登録
  // （データベースから書籍が削除されたときの処理）
  booksRef.on('child_removed', (bookSnapshot) => {
    const bookId = bookSnapshot.key;
    const $book = $(`#book-id-${bookId}`);

    $($book).remove();
  });

  // books の child_addedイベントハンドラを登録
  // （データベースに書籍が追加保存されたときの処理）
  booksRef.on('child_added', (bookSnapshot) => {
    const bookId = bookSnapshot.key;
    const bookData = bookSnapshot.val();

    // 書籍一覧画面に書籍データを表示する
    addBook(bookId, bookData);
  });
};

/**
 * ----------------------
 * すべての画面共通で使う関数
 * ----------------------
 */

// ビュー（画面）を変更する
const showView = (id) => {
  $('.view').hide();
  $(`#${id}`).fadeIn();

  if (id === 'bookshelf') {
    loadBookshelfView();
  }
};

/**
 * -------------------------
 * ログイン・ログアウト関連の関数
 * -------------------------
 */

// ログインフォームを初期状態に戻す
const resetForm = () => {

  $('#register__form__help').hide();
  $('#login__form__help').hide();
  
  $('#login__login__submit-button')
    .prop('disabled', false)
    .text('ログイン');
  
  // 新規登録ボタン
  $('#register__register__submit-button')
    .prop('disabled', false)
    .text('新規登録');
};

// ログインした直後に呼ばれる
const onLogin = () => {
  console.log('ログイン完了');

  // 書籍一覧画面を表示
  showView('bookshelf');
};

// ログアウトした直後に呼ばれる
const onLogout = () => {
  const booksRef = firebase.database().ref('books');

  // 過去に登録したイベントハンドラを削除
  booksRef.off('child_removed');
  booksRef.off('child_added');

  showView('login');
};

/**
 * ------------------
 * イベントハンドラの登録
 * ------------------
 */

// ログイン状態の変化を監視する
firebase.auth().onAuthStateChanged((user) => {
  // ログイン状態が変化した
  if (user) {
    // ログイン済
    onLogin();
  } else {
    // 未ログイン
    onLogout();
  }
});


//「新規登録画面へ」ボタン押下後の処理
$('#login__register__submit-button').on('click', (e) => {
  //フォームをリセット
  resetForm();
  // 新規登録画面を表示する
  showView('register');
});

//「ログイン画面へ」ボタン押下後の処理
$('#register__login__submit-button').on('click', (e) => {
  //フォームをリセット
  resetForm();
  // ログイン画面を表示する
  showView('login');
});

// 新規登録フォームが送信されたらログインする
$('#register-form').on('submit', (e) => {
  e.preventDefault();
  
  const $registerButton = $('#register__register__submit-button');
  $registerButton.text('登録中…');
  
  //ボタンを非活性にする
  $registerButton.prop("disabled", true);
  
  const email = $('#register-email').val();
  const password = $('#register-password').val();

  // ログインを試みる
  firebase
    .auth()
    .createUserWithEmailAndPassword(email, password)
    .then(() => {
      // 新規登録に成功したときの処理
      console.log('新規登録に成功しました。');

      // 新規登録フォームを初期状態に戻す
      resetForm();
    })
    .catch((error) => {
      // 新規登録に失敗したときの処理
      console.error('新規登録に成功に失敗しました', error);

      $('#register__form__help')
        .text('新規登録に失敗しました。')
        .show();

      // 新規登録ボタンを元に戻す
      $registerButton.text('新規登録');
      
      //新規登録ボタンを活性に戻す
      $registerButton.prop("disabled", false);

    });
});

// ログインフォームが送信されたらログインする
$('#login-form').on('submit', (e) => {
  e.preventDefault();
  
  const $loginButton = $('#login__login__submit-button');
  $loginButton.text('送信中…');
  
  //ボタンを非活性にする
  $loginButton.prop("disabled", true);
  
  const email = $('#login-email').val();
  const password = $('#login-password').val();

  // ログインを試みる
  firebase
    .auth()
    .signInWithEmailAndPassword(email, password)
    .then(() => {
      // ログインに成功したときの処理
      console.log('ログインしました。');

      // ログインフォームを初期状態に戻す
      resetForm();
    })
    .catch((error) => {
      // ログインに失敗したときの処理
      console.error('ログインエラー', error);

      $('#login__form__help')
        .text('メールアドレスまたはパスワードが誤っています。')
        .show();

      // ログインボタンを元に戻す
      $loginButton.text('ログイン');
      
      //ログインボタンを活性に戻す
      $loginButton.prop("disabled", false);

    });
});

// ログアウトボタンが押されたらログアウトする
$('.logout-button').on('click', () => {
  firebase
    .auth()
    .signOut()
    .catch((error) => {
      console.error('ログアウトに失敗:', error);
    });
});

/**
 * -------------------------
 * 書籍情報追加モーダル関連の処理
 * -------------------------
 */

// 書籍の登録モーダルを初期状態に戻す
const resetAddBookModal = () => {
  $('#book-form')[0].reset();
  $('#add-book-image-label').text('');
  $('#submit_add_book')
    .prop('disabled', false)
    .text('保存する');
};

// 選択した表紙画像の、ファイル名を表示する
$('#add-book-image').on('change', (e) => {
  const input = e.target;
  const $label = $('#add-book-image-label');
  const file = input.files[0];

  if (file != null) {
    $label.text(file.name);
  } else {
    $label.text('ファイルを選択');
  }
});

// 書籍の登録処理
$('#book-form').on('submit', (e) => {
  e.preventDefault();

  // 書籍の登録ボタンを押せないようにする
  $('#submit_add_book')
    .prop('disabled', true)
    .text('送信中…');

  // 書籍タイトル
  const bookTitle = $('#add-book-title').val();

  // おすすめ度
  const bookStar = $('#add-book-star').data('raty').score();

  const $bookImage = $('#add-book-image');
  const { files } = $bookImage[0];

  if (files.length === 0) {
    // ファイルが選択されていないなら何もしない
    return;
  }

  const file = files[0]; // 表紙画像ファイル
  const filename = file.name; // 画像ファイル名
  const bookImageLocation = `book-images/${filename}`; // 画像ファイルのアップロード先

  // 書籍データを保存する
  firebase
    .storage()
    .ref(bookImageLocation)
    .put(file) // Storageへファイルアップロードを実行
    .then(() => {
      // Storageへのアップロードに成功したら、Realtime Databaseに書籍データを保存する
      const bookData = {
        bookTitle,
        bookStar,
        bookImageLocation,
        createdAt: firebase.database.ServerValue.TIMESTAMP,
      };
      return firebase
        .database()
        .ref('books')
        .push(bookData);
    })
    .then(() => {
      // 書籍一覧画面の書籍の登録モーダルを閉じて、初期状態に戻す
      $('#add-book-modal').modal('hide');
      resetAddBookModal();
    })
    .catch((error) => {
      // 失敗したとき
      console.error('エラー', error);
      resetAddBookModal();
      $('#add-book__help')
        .text('保存できませんでした。')
        .fadeIn();
    });
});