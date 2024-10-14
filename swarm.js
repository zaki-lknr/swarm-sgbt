/**
 * get swarm checkin list
 * @author zaki
 * @see https://github.com/zaki-lknr/swarm-sgbt
 */

import {JpzBskyClient} from "./bsky-client/bsky-client.js";

const app_name = "Swarm SGBT";
const app_version = '0.7.0';

/**
 * htmlロード時のイベントリスナ設定
 */
document.addEventListener("DOMContentLoaded", () => {
    load_data();
    switch_app_style();

    // リスナー設定をこの外に記述するとやはり早すぎて無効なのでここ
    document.getElementById('btn_save').addEventListener('click', ()=> {
        save_configure();
        switch_configure();
    });
    document.getElementById('btn_load').addEventListener('click', ()=> {
        load_configure();
    });
    document.getElementById('btn_swm_oauth').addEventListener('click', ()=> {
        swarm_oauth();
    });
    document.getElementById('client_id').addEventListener('input', () => {
        input_changed();
    })
    document.getElementById('client_secret').addEventListener('input', () => {
        input_changed();
    })
    document.getElementById('btn_reload').addEventListener('click', ()=> {
        reload_data();
    });
    document.getElementsByClassName('configure')[0].addEventListener('click', ()=> {
        switch_configure();
    });
    document.getElementById('copy_text').addEventListener('click', ()=> {
        copy_text();
    });
    document.getElementsByClassName('copy_text')[0].addEventListener('click', ()=> {
        copy_text();
    });
    document.getElementsByClassName('error_icon')[0].addEventListener('click', ()=> {
        close_notify(true);
    });
    document.getElementById('style_sgbt').addEventListener('change', ()=> {
        switch_app_style("sgbt");
    });
    document.getElementById('style_njgk').addEventListener('change', ()=> {
        switch_app_style("njgk");
    });
    view_main();
    close_notify();
    input_changed();
});

/**
 * 設定保存
 */
const save_configure = () => {
    // console.log("save_configure() begin");
    // get form data
    const client_id = document.getElementById("client_id").value;
    const client_secret = document.getElementById("client_secret").value;
    const input_token = document.getElementById("oauth_token").value;
    const input_apikey = document.getElementById("api_key").value;
    // bsky
    const bsky_id = document.getElementById("bsky_id").value;
    const bsky_pass = document.getElementById("bsky_pass").value;

    // console.log("oauth_token: " + input_token);
    const post_bsky = document.getElementById("post_bsky").checked;
    const view_image = document.getElementById("view_image").checked;
    const include_sns = document.getElementById("include_sns").checked;
    const edit_tweet = document.getElementById("edit_tweet").checked;

    const styles = document.getElementsByName("window_style");
    let style_type;
    for (const s of styles) {
        // console.log(s);
        // console.log(s.checked);
        // console.log(s.value);
        if (s.checked) {
            style_type = s.value;
        }
    }

    const configure = {
        app: {
            view_image: view_image,
            include_sns: include_sns,
            edit_tweet: edit_tweet,
            post_bsky: post_bsky,
            style_type: style_type
        },
        swarm: {
            oauth_token: input_token,
            api_key: input_apikey,
            client_id: client_id,
            client_secret: client_secret,
        },
        bsky: {
            bsky_id: bsky_id,
            bsky_pass: bsky_pass,
        },
    }
    // console.log(configure);
    // save to local storage
    localStorage.setItem('configure', JSON.stringify(configure));
}

/**
 * 設定読み出し
 * @returns 設定情報
 */
const load_configure = () => {
    // console.log("load_configure() begin");

    const configure = JSON.parse(localStorage.getItem('configure'));
    // update page
    // console.log('token: '+ configure.oauth_token);
    if (configure?.swarm?.client_id)
        document.getElementById("client_id").value = configure?.swarm?.client_id;
    if (configure?.swarm?.client_secret)
        document.getElementById("client_secret").value = configure?.swarm?.client_secret;
    if (configure?.swarm?.oauth_token)
        document.getElementById("oauth_token").value = configure?.swarm?.oauth_token;
    if (configure?.swarm?.api_key)
        document.getElementById("api_key").value = configure?.swarm?.api_key;

    if (configure?.bsky?.bsky_id)
        document.getElementById("bsky_id").value = configure?.bsky?.bsky_id;
    if (configure?.bsky?.bsky_pass)
        document.getElementById("bsky_pass").value = configure?.bsky?.bsky_pass;

    document.getElementById("view_image").checked = configure?.app?.view_image;
    document.getElementById("post_bsky").checked = configure?.app?.post_bsky;
    document.getElementById("include_sns").checked = configure?.app?.include_sns;
    document.getElementById("edit_tweet").checked = configure?.app?.edit_tweet;

    switch (configure?.app?.style_type) {
        case "njgk":
            document.getElementById('style_njgk').checked = true;
            break;
        case "sgbt":
        default:
            document.getElementById('style_sgbt').checked = true;
            break;
    }

    return configure;
}

/**
 * チェックインデータ新規取得
 */
const reload_data = async() => {
    const configure = load_configure();
    const url = 'https://api.foursquare.com/v2/users/self/checkins?v=20231010&limit=30&offset=0&oauth_token=' + configure.swarm.oauth_token;
    // console.log('url: ' + url);
    const headers = new Headers();
    headers.append('accept', 'application/json');

    const res = await fetch(url, { headers: headers });
    if (!res.ok) {
        set_error('Failed: Get User Checkins: ' + await res.text());
        return;
    }

    const body = await res.text();
    // console.log('body: ' + body);

    localStorage.setItem('rest_response', body);

    clear_data();
    load_data();
}

/**
 * Swarm OAuth開始
 */
const swarm_oauth = () => {
    // console.log('swarm_oauth() begin');
    save_configure();
    const configure = load_configure();
    const client_id = configure?.swarm?.client_id;
    const client_secret = configure?.swarm?.client_secret;
    const redirect_url = location.href;
    if ((client_id.length > 0) && (client_secret.length > 0)) {
        const url = 'https://foursquare.com/oauth2/authenticate?client_id=' + client_id + '&response_type=code&redirect_uri=' + redirect_url;
        window.location.href = url;
    }
    else {
        set_error("Client ID or Client Secret is blank");
    }
}

/**
 * Swarm OAuthレスポンス処理
 * @param {string} トークン
 */
const swarm_oauth2 = async (code) => {
    // console.log('swarm_oauth2() begin');
    const configure = load_configure();
    const client_id = configure?.swarm?.client_id;
    const client_secret = configure?.swarm?.client_secret;
    const redirect_url = location.href.replace(/\?.*/, '');
    const url = 'https://foursquare.com/oauth2/access_token?client_id=' + client_id + '&client_secret=' + client_secret +'&grant_type=authorization_code&redirect_uri=' + redirect_url + '&code=' + code;
    // console.log("access to: " + url);
    const res = await fetch('https://corsproxy.io/?' + encodeURIComponent(url));
    if (!res.ok) {
        set_error('Failed: Foursquare OAuth2: ' + await res.text());
        return;
    }

    const response = await res.json();
    if (response.access_token.length > 0) {
        load_configure();
        document.getElementById("oauth_token").value = response.access_token;
        save_configure();
        window.location.href = redirect_url;
    }
}

/**
 * 添付画像URL取得処理
 * @param {number} 画面サイズ
 * @param {number} チェックイン内の総画像数
 * @param {Object} photoオブジェクト
 * @returns URL
 */
const get_image_url = (disp_width, count, photo) => {
    // console.log('display width: ' + disp_width);
    if (count === 0) {
        // count=0はオリジナルの値を返す
        return photo.prefix + photo.width + 'x' + photo.height + photo.suffix;
    }
    else {
        let w = disp_width * 0.94; // fixme
        let h = photo.height * w / photo.width;
        if (count != 1) {
            // さらに半分
            w = w / 2;
            h = h / 2;
        }
        return photo.prefix + Math.round(w) + 'x' + Math.round(h) + photo.suffix;
    }
}

/**
 * データロードと画面描画
 */
const load_data = () => {
    // title version
    document.getElementById('title').textContent = app_name + ' ver.' + app_version + ' / jpz-bsky:' + JpzBskyClient.getVersion();

    // oauth?
    if (window.location.search.length > 0) { // fixme
        const param = new URLSearchParams(window.location.search);
        // console.log(param);
        const code = param.get('code');
        console.log(code);
        const token = swarm_oauth2(code);
        return;
    }

    // preview?
    const configure = load_configure();
    const preview_image = configure?.app?.view_image;

    const checkins = localStorage.getItem('rest_response');
    // console.log('checkins: ' + checkins);
    if (checkins === null) {
        console.log('no data');
        // button文言の更新
        const button = document.getElementById("btn_reload");
        button.textContent = 'get checkin data';
        if (! configure?.swarm?.oauth_token) {
            button.disabled = true;
            // OAuth実行時は画面遷移が発生するため初期値有効で描画されるので明示的な解除は不要
        }
    }
    else {
        const checkin_data = JSON.parse(checkins);
        // console.log('checkin_data: ' + checkin_data);

        const display = document.getElementById("checkin_list");
        let index = 0;
        const today = new Date();   // 当日チェックインカウント判定用
        let today_count = 0;
        // console.log(today.toLocaleDateString());
        for (let checkin of checkin_data.response.checkins.items) {
            // console.log("checkin: " + checkin.venue.name);
            // console.log("createdAt: " + checkin.venue.createdAt);

            const component = document.createElement("div");

            const venue_name = document.createElement("div");
            venue_name.id = checkin.id + '_comment';

            venue_name.textContent = create_share_string(checkin);

            const form_part = document.createElement("div");
            const url_input = document.createElement("input");
            url_input.type = 'text';
            url_input.id = checkin.id;
            if ('checkinShortUrl' in checkin) {
                url_input.value = checkin.checkinShortUrl;
            }
            form_part.appendChild(url_input);
            // form_part.appendChild(rest_button);

            const header_part = document.createElement("div");

            const checkin_datetime = document.createElement("div");
            const datetime = new Date(checkin.createdAt * 1000);
            checkin_datetime.textContent = '['+ (++index) + '] ' + datetime.toLocaleDateString() + ' ' + datetime.toLocaleTimeString();
            if (datetime.toLocaleDateString() === today.toLocaleDateString()) {
                today_count++;
            }

            header_part.appendChild(checkin_datetime);
            const rest_button = document.createElement("button");
            rest_button.textContent = "share";
            // rest_button.onclick = 'create_share()'; // 効かない
            rest_button.addEventListener('click', ()=> {
                create_share(checkin);
            });
            header_part.appendChild(rest_button);

            // item config
            const bsky_checkbox = document.createElement("input");
            bsky_checkbox.type = 'checkbox';
            bsky_checkbox.id = 'bsky_' + checkin.id;
            bsky_checkbox.name = 'bsky_' + checkin.id;
            bsky_checkbox.value = 'bsky_' + checkin.id;
            bsky_checkbox.className = 'checkbox';
            bsky_checkbox.checked = configure.app.post_bsky;
            const bsky_chk_label = document.createElement("label");
            bsky_chk_label.htmlFor = 'bsky_' + checkin.id;
            bsky_chk_label.textContent = '🦋';
            header_part.appendChild(bsky_checkbox);
            header_part.appendChild(bsky_chk_label);
            if (!configure.bsky.bsky_id || !configure.bsky.bsky_pass) {
                bsky_checkbox.disabled = true;
                bsky_chk_label.disabled = true;
            }

            const tw_checkbox = document.createElement("input");
            tw_checkbox.type = 'checkbox';
            tw_checkbox.id = 'tw_edit_' + checkin.id;
            tw_checkbox.name = 'tw_edit_' + checkin.id;
            tw_checkbox.value = 'tw_edit_' + checkin.id;
            tw_checkbox.className = 'checkbox';
            tw_checkbox.checked = configure.app.edit_tweet;
            const tw_chk_label = document.createElement("label");
            tw_chk_label.htmlFor = 'tw_edit_' + checkin.id;
            tw_chk_label.textContent = '𝕏';
            header_part.appendChild(tw_checkbox);
            header_part.appendChild(tw_chk_label);

            const acc_checkbox = document.createElement("input");
            acc_checkbox.type = 'checkbox';
            acc_checkbox.id = 'acc_include_' + checkin.id;
            acc_checkbox.name = 'acc_include_' + checkin.id;
            acc_checkbox.value = 'acc_include_' + checkin.id;
            acc_checkbox.className = 'checkbox';
            acc_checkbox.checked = configure.app.include_sns;
            const acc_chk_label = document.createElement("label");
            acc_chk_label.htmlFor = 'acc_include_' + checkin.id;
            acc_chk_label.textContent = '@';
            header_part.appendChild(acc_checkbox);
            header_part.appendChild(acc_chk_label);
            if (!configure.swarm.api_key.length) {
                acc_checkbox.disabled = true;
                acc_chk_label.disabled = true;
            }

            const photo_count = checkin.photos.count;
            // console.log("photo count: " + photo_count);
            const photo_view = document.createElement("div");
            if (photo_count > 0) {
                for (let photos of checkin.photos.items) {
                    const photo_item = document.createElement("img");
                    photo_item.src = get_image_url(document.body.clientWidth, photo_count, photos);
                    photo_item.className = 'photo_view';
                    if (preview_image) {
                        photo_view.appendChild(photo_item);
                    }
                }
            }

            const item_hr = document.createElement("hr");
            // component.appendChild(comment_view);
            component.appendChild(item_hr);
            component.appendChild(header_part);
            component.appendChild(venue_name);
            component.appendChild(form_part);
            component.appendChild(photo_view);
            display.appendChild(component);
        }
        const comment_view = document.getElementById("comment");
        comment_view.textContent = 'todays checkin: ' + today_count;
    }
}

/**
 * 共有用文字列作成
 * @param {object} checkinオブジェクト
 * @param {string} ヴェニューのSNSアカウント名
 * @returns 共有用文字列
 */
const create_share_string = (checkin, twitter_id = null) => {
    let location_str = '';
    let return_string;
    let twitter_string = '';
    let event_string = '';

    if ('event' in checkin) {
        event_string = ' for ' + checkin.event.name;
    }
    // formattedAddressが無いヴェニューもある
    if ('formattedAddress' in checkin.venue.location) {
        const location = ('address' in checkin.venue.location)? 1: 0;
        location_str = ' in ' + checkin.venue.location.formattedAddress[location];
    }
    if (twitter_id) {
        twitter_string = ' - @' + twitter_id;
    }

    if ('shout' in checkin) {
        return_string = checkin.shout + ' (@ ' + checkin.venue.name + twitter_string + event_string + location_str + ')';
    }
    else {
        return_string = "I'm at " + checkin.venue.name + twitter_string + event_string + location_str;
    }

    return return_string;
}

/**
 * チェックインリストの表示クリア
 */
const clear_data = () => {
    // console.log('clear_data() begin');
    let display = document.getElementById("checkin_list");
    // display.removeChild(display.firstChild);
    // for(let child of display.children) {  // ループ中にリストが変化するのでNG
        // display.removeChild(child);
    while(display.firstChild) {
        // console.log(display);
        display.removeChild(display.firstChild);
    }
}

/**
 * シェアボタン押下
 * @param {object} checkinオブジェクト
 */
const create_share = async (checkin) => {
    set_progress('get detail...');
    const configure = load_configure();
    // console.log("create_share() begin: " + checkin_id);
    // get configure
    const enable_tweet = document.getElementById('tw_edit_' + checkin.id).checked;
    const include_account = document.getElementById('acc_include_' + checkin.id).checked;
    const post_bsky = document.getElementById('bsky_' + checkin.id).checked;

    const detail = await get_detail(checkin.id, configure);
    document.getElementById(checkin.id).value = detail.checkinShortUrl;
    console.log(checkin);

    // const comment = document.getElementById(checkin.id + '_comment').textContent;
    const comment = create_share_string(detail, (include_account)? detail.venueInfo.twitter: null);
    const share_comment = comment + "\n" + detail.checkinShortUrl;
    console.log(comment);
    navigator.clipboard.writeText(share_comment);
    if (enable_tweet) {
        window.open('https://x.com/intent/tweet?url=' + detail.checkinShortUrl + '&text=' + encodeURIComponent(comment));
    }

    if (post_bsky) {
        set_progress('sending...');
        const bsky = new JpzBskyClient(configure.bsky.bsky_id, configure.bsky.bsky_pass);
        bsky.enableCorsProxyAtOgp(true);
        bsky.enableCorsProxyAtGetImage(false);
        bsky.setClientVia(app_name);
        for (const photo of checkin.photos.items) {
            // bsky.setImageUrl(checkin.photos.items[]);
            const photo_url = get_image_url(photo.width, 0, photo);
            console.log(photo_url);
            bsky.setImageUrl(photo_url);
        }
        try {
            set_progress('sending...');
            await bsky.post(share_comment);
        }
        catch (e) {
            set_error(e);
            return;
        }
    }
    // console.log("send done");
    close_notify();
}

/**
 * チェックイン詳細取得
 * @param {string} チェックインID
 * @param {object} 設定オブジェクト
 * @returns
 */
const get_detail = async (checkin_id, configure) => {
    const checkins = localStorage.getItem('rest_response');
    // console.log('checkins: ' + checkins);
    const checkin_data = JSON.parse(checkins);

    let result = {};
    for (let checkin of checkin_data.response.checkins.items) {
        // console.log('saved checkin id: ' + checkin.id);
        if (checkin_id === checkin.id) {
            // consolog.log('checkin id: ' + checkin_id);
            if ('checkinShortUrl' in checkin) {
                console.log('shortcut url is exist');
            }
            else {
                console.log('shortcut url is not exist');

                const url = 'https://api.foursquare.com/v2/checkins/' + checkin_id + '?v=20231010&oauth_token=' + configure.swarm.oauth_token;
                const headers = new Headers();
                headers.append('accept', 'application/json');
            
                const res = await fetch(url, { headers: headers });
                if (!res.ok) {
                    set_error('Failed: Get Check-in Details: ' + await res.text());
                    return;
                }
                const response = await res.json();
                // console.log(response.response.checkin.checkinShortUrl);
            
                checkin.checkinShortUrl = response.response.checkin.checkinShortUrl;
            }
            if ('venueInfo' in checkin) {
                // 追加情報あり(または取得済み未設定)
                // console.log('already exist');
            }
            else if (!checkin.venue.private && !checkin.venue.closed) {
                if (configure.swarm.api_key.length > 0) {
                    // 取得
                    console.log("get place info");
                    const url = 'https://api.foursquare.com/v3/places/' + checkin.venue.id + '?fields=social_media';
                    const headers = new Headers();
                    headers.append('accept', 'application/json');
                    headers.append('Authorization', configure.swarm.api_key);
                    const res = await fetch(url, { headers: headers });
                    if (res.status === 404) {
                        // venueの詳細情報が無い(原因不明)
                        console.log(await res.text());
                        checkin.venueInfo = {};
                        // 台場交差点(id:4bee05ae4daaa593c7a88f61)
                        // 台場2丁目バス停(id:4d397ec6beb7b1f72fbedf71)
                        // …など
                    }
                    else if (res.status === 200) {
                        const response = await res.json();
                        console.log(response.social_media.twitter);

                        checkin.venueInfo = {twitter: response.social_media.twitter};
                    }
                    else {
                        // error
                        set_error('Failed: Get Place Details: ' + await res.text());
                        // エラー表示するが続行不可能ではないので表示のみ
                        checkin.venueInfo = {};
                    }
                }
                else {
                    checkin.venueInfo = {};
                }
            }
            else {
                // console.log('private or obsolete');
                checkin.venueInfo = {};
            }
            result = checkin;
            break;
        }
    }
    localStorage.setItem('rest_response', JSON.stringify(checkin_data));

    return result;
}

const switch_configure = () => {
    // console.log("configure!: " + document.getElementById("configure").style.display);
    if (document.getElementById("configure").style.display == 'none') {
        document.getElementById("configure").style.display = '';
        document.getElementById("control").style.display = 'none';
        document.getElementById("checkin_list").style.display = 'none';
    }
    else {
        clear_data();
        load_data();
        view_main();
    }
}

const view_main = () => {
    document.getElementById("configure").style.display = 'none';
    document.getElementById("control").style.display = '';
    document.getElementById("checkin_list").style.display = '';
}

const copy_text = () => {
    const element = document.getElementById('copy_text');
    const link = element.textContent;
    console.log(link);
    navigator.clipboard.writeText(link);

    const range = document.createRange();
    range.selectNodeContents(element);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
}

/**
 * エラーメッセージ表示
 * @param {string} エラーメッセージ(省略時はクリア)
 */
const set_error = (error = null) => {
    const error_notify = document.getElementById('error_notify');
    // console.log("set_error(start)");
    document.getElementById('error_message').textContent = error;
    error_notify.className = 'error_notify';
    error_notify.disabled = false;
    error_notify.style.display = 'flex';
    document.getElementById('error_icon').className = 'error_icon';
}

/**
 * 進捗メッセージ表示
 * @param {string} 進捗用メッセージ(省略時はクリア)
 */
const set_progress = (msg = null) => {
    const error_notify = document.getElementById('error_notify');
    // console.log("set_progress(start)");
    const elem = document.getElementById('error_message');
    elem.textContent = msg;
    error_notify.className = 'progress_notify';
    error_notify.disabled = true;
    error_notify.style.display = 'flex';
    document.getElementById('error_icon').className = 'progress_icon';
}


/**
 * 通知領域非表示
 * @param {boolean} 手動操作フラグ
 */
const close_notify = (manual = false) => {
    const error_notify = document.getElementById('error_notify');
    // console.log("close_notify");
    // console.log(error_notify.disabled);
    if (error_notify.disabled && manual) {
        // progressの場合の手動操作はクローズしない
        console.log("progress(not close");
        return;
    }
    else {
        // console.log("close");
    }
    error_notify.style.display = 'none';
}

/**
 * client id/secretテキストフィールド入力ハンドラ
 */
const input_changed = () => {
    // console.log('input_changed begin');
    const id = document.getElementById('client_id').value;
    const secret = document.getElementById('client_secret').value;

    const btn_oauth = document.getElementById('btn_swm_oauth');

    if (id.length && secret.length) {
        // 入力済み
        btn_oauth.disabled = false;
    }
    else {
        btn_oauth.disabled = true;
    }
}

/**
 * スタイル変更
 * @param {string} スタイル指定キーワード(指定なし時は保存済みconfigureから)
 */
const switch_app_style = (style = null) => {
    // style設定
    if (style === null) {
        const configure = load_configure();
        style = configure?.app?.style_type;
    }
    switch (style) {
        case "njgk":
            document.getElementById("style").setAttribute("href", "style-njgk.css");
            document.getElementById("manifest").setAttribute("href", "manifest-njgk.json");
            break;
        case "sgbt":
        default:
            document.getElementById("style").setAttribute("href", "style-sgbt.css");
            document.getElementById("manifest").setAttribute("href", "manifest-sgbt.json");
            break;
    }
}
