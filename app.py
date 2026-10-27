# -*- coding: utf-8 -*-
from flask import Flask, send_from_directory, jsonify, request

app = Flask(__name__, static_folder='.')

@app.route('/')
def index():
    return send_from_directory('.', 'popup.html')

@app.route('/<path:filename>')
def static_files(filename):
    return send_from_directory('.', filename)

@app.route('/api/shamcash/verify', methods=['POST'])
def verify_shamcash():
    data = request.get_json(silent=True) or {}
    return jsonify({
        "status": "success",
        "platform": "ئۇيغۇر تىجارەتلىرى - ShamCash",
        "verified_account": data.get("shamCode", "SC-VERIFIED"),
        "region": "شەرقىي تۈركىستان & سۈرىيە"
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)