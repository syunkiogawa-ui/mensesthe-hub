from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import sqlite3
import os
from datetime import datetime

app = Flask(__name__, static_folder='static')
CORS(app, origins="*")

# データベースパス
DB_PATH = os.path.join(os.path.dirname(__file__), 'database', 'therapists.db')

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    static_folder_path = app.static_folder
    if static_folder_path is None:
        return "Static folder not configured", 404

    if path != "" and os.path.exists(os.path.join(static_folder_path, path)):
        return send_from_directory(static_folder_path, path)
    else:
        index_path = os.path.join(static_folder_path, 'index_reference_style.html')
        if os.path.exists(index_path):
            return send_from_directory(static_folder_path, 'index_reference_style.html')
        else:
            return "index_reference_style.html not found", 404

# 認証API（撤廃 - 常に認証済み状態を返す）
@app.route('/api/auth/verify', methods=['GET'])
def verify_auth():
    return jsonify({
        'authenticated': True,
        'user': {'id': 'guest', 'name': 'ゲストユーザー'}
    })

# セラピスト検索API（認証不要）
@app.route('/api/search/therapists', methods=['GET'])
def search_therapists():
    try:
        # パラメータ取得
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 20))
        keyword = request.args.get('keyword', '').strip()
        prefecture = request.args.get('prefecture', '').strip()
        age_range = request.args.get('age_range', '').strip()
        cup_size = request.args.get('cup_size', '').strip()
        tolerance = request.args.get('tolerance', '').strip()
        appearance = request.args.get('appearance', '').strip()
        
        # SQLクエリ構築
        query = """
        SELECT id, name, age, shop_name, area, cup_size, tolerance, appearance, review, shop_url
        FROM therapists 
        WHERE 1=1
        """
        params = []
        
        if keyword:
            query += " AND (name LIKE ? OR shop_name LIKE ?)"
            params.extend([f'%{keyword}%', f'%{keyword}%'])
        
        if prefecture:
            query += " AND area LIKE ?"
            params.append(f'%{prefecture}%')
        
        if age_range:
            query += " AND age = ?"
            params.append(age_range)
        
        if cup_size:
            query += " AND cup_size = ?"
            params.append(cup_size)
        
        if tolerance:
            query += " AND tolerance = ?"
            params.append(tolerance)
        
        if appearance:
            query += " AND appearance = ?"
            params.append(appearance)
        
        # ページネーション
        offset = (page - 1) * per_page
        query += f" LIMIT {per_page} OFFSET {offset}"
        
        # データベース接続・実行
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(query, params)
        therapists = cursor.fetchall()
        
        # 総件数取得
        count_query = query.split('LIMIT')[0].replace('SELECT id, name, age, shop_name, area, cup_size, tolerance, appearance, review, shop_url', 'SELECT COUNT(*)')
        cursor.execute(count_query, params)
        total_count = cursor.fetchone()[0]
        
        conn.close()
        
        # 結果をdict形式に変換
        therapist_list = []
        for therapist in therapists:
            # 年齢データの処理
            age_str = str(therapist['age']) if therapist['age'] else "不明"
            age_group = age_str  # そのまま使用（例：20代）
            
            therapist_dict = {
                'id': therapist['id'],
                'name': therapist['name'],  # 名前はそのまま表示（年齢重複削除）
                'age': therapist['age'],
                'age_group': age_group,
                'shop_name': therapist['shop_name'],
                'shop_area': therapist['area'],
                'cup_size': therapist['cup_size'],
                'tolerance': therapist['tolerance'],
                'appearance': therapist['appearance'],
                'review_excerpt': therapist['review'] if therapist['review'] else '',  # レビュー全文表示
                'shop_url': therapist['shop_url']
            }
            therapist_list.append(therapist_dict)
        
        # ページネーション情報
        has_next = (page * per_page) < total_count
        has_prev = page > 1
        
        return jsonify({
            'therapists': therapist_list,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': total_count,
                'has_next': has_next,
                'has_prev': has_prev
            }
        })
        
    except Exception as e:
        print(f"Search therapists API error: {e}")
        return jsonify({'error': str(e)}), 500

# フィルターオプション取得API
@app.route('/api/filter-options', methods=['GET'])
def get_filter_options():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 都道府県一覧
        cursor.execute("SELECT DISTINCT area FROM therapists WHERE area IS NOT NULL AND area != '' ORDER BY area")
        prefectures = [row[0] for row in cursor.fetchall()]
        
        # 年齢一覧
        cursor.execute("SELECT DISTINCT age FROM therapists WHERE age IS NOT NULL AND age != '' ORDER BY CAST(age AS INTEGER)")
        ages = [row[0] for row in cursor.fetchall()]
        
        # カップサイズ一覧
        cursor.execute("SELECT DISTINCT cup_size FROM therapists WHERE cup_size IS NOT NULL AND cup_size != '' ORDER BY cup_size")
        cup_sizes = [row[0] for row in cursor.fetchall()]
        
        # プレイ内容一覧
        cursor.execute("SELECT DISTINCT tolerance FROM therapists WHERE tolerance IS NOT NULL AND tolerance != '' ORDER BY tolerance")
        play_contents = [row[0] for row in cursor.fetchall()]
        
        # 容姿一覧
        cursor.execute("SELECT DISTINCT appearance FROM therapists WHERE appearance IS NOT NULL AND appearance != '' ORDER BY appearance")
        appearances = [row[0] for row in cursor.fetchall()]
        
        conn.close()
        
        return jsonify({
            'areas': prefectures,
            'ages': ages,
            'cupSizes': cup_sizes,
            'playContents': play_contents,
            'appearances': appearances
        })
        
    except Exception as e:
        print(f"Filter options API error: {e}")
        return jsonify({'error': str(e)}), 500

# お気に入り追加API（認証不要 - ゲストユーザーとして処理）
@app.route('/api/favorites/add', methods=['POST'])
def add_favorite():
    try:
        data = request.get_json()
        therapist_id = data.get('therapist_id')
        
        if not therapist_id:
            return jsonify({'success': False, 'message': 'セラピストIDが必要です'}), 400
        
        # ゲストユーザーの場合、セッション内でのみお気に入りを管理
        # 実際の実装では、セッションやローカルストレージを使用
        return jsonify({
            'success': True, 
            'message': 'お気に入りに追加しました（ゲストユーザー）'
        })
        
    except Exception as e:
        print(f"Add favorite API error: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

# お気に入り削除API（認証不要）
@app.route('/api/favorites/remove', methods=['POST'])
def remove_favorite():
    try:
        data = request.get_json()
        therapist_id = data.get('therapist_id')
        
        if not therapist_id:
            return jsonify({'success': False, 'message': 'セラピストIDが必要です'}), 400
        
        # ゲストユーザーの場合、セッション内でのみお気に入りを管理
        return jsonify({
            'success': True, 
            'message': 'お気に入りから削除しました（ゲストユーザー）'
        })
        
    except Exception as e:
        print(f"Remove favorite API error: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)

