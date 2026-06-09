#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import os
import re
import time
import random
import requests
from datetime import datetime

# 基金列表
FUNDS = [
    {"name": "华宝纳斯达克精选", "code": "017436"},
    {"name": "浦银安盛全球智能科技", "code": "006555"},
    {"name": "广发全球精选", "code": "000906"},
    {"name": "嘉实全球产业升级", "code": "017730"},
    {"name": "嘉实美国成长", "code": "000043"},
    {"name": "易方达标普信息科技", "code": "012868"},
    {"name": "易方达全球成长精选", "code": "012920"},
    {"name": "国富全球科技", "code": "006373"},
    {"name": "建信新兴市场混合", "code": "018147"},
    {"name": "汇添富全球移动互联", "code": "001668"},
    {"name": "华夏全球科技先锋", "code": "024239"},
    {"name": "华夏移动互联", "code": "002891"},
    {"name": "嘉实美国消费", "code": "501979"},
    {"name": "广发纳斯达克100指数", "code": "270042"},
    {"name": "南方全球精选", "code": "202801"},
]

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Referer": "https://fund.eastmoney.com/",
}

def fetch_realtime(code):
    """获取基金实时估值"""
    url = f"https://fundgz.1234567.com.cn/js/{code}.js"
    try:
        resp = requests.get(url, headers=HEADERS, timeout=10)
        resp.encoding = 'utf-8'
        text = resp.text
        match = re.search(r'jsonpgz\((.*)\)', text, re.DOTALL)
        if not match:
            return None
        data = json.loads(match.group(1))
        return {
            "estimatedRate": float(data.get("gszzl", 0) or 0),
            "estimatedValue": float(data.get("gsz", 0) or 0),
            "updateTime": data.get("gztime", ""),
        }
    except Exception as e:
        print(f"  [错误] {code}: {e}")
        return None

def fetch_limit(code):
    """爬取基金限额信息"""
    try:
        url = f"https://fund.eastmoney.com/{code}.html"
        resp = requests.get(url, headers=HEADERS, timeout=10)
        resp.encoding = 'utf-8'
        
        patterns = [
            r'单日累计申购金额上限[：:]\s*([^\n<]{3,30})',
            r'申购限额[：:]\s*([^\n<]{3,30})',
            r'限制大额申购[：:]\s*([^\n<]{3,30})',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, resp.text)
            if match:
                text = match.group(1).strip()
                if text:
                    return "限额" + text
        
        return ""
    except Exception as e:
        return ""

def fetch_nav(code):
    """获取基金净值"""
    url = f"https://api.fund.eastmoney.com/f10/lsjz?callback=jQuery&fundCode={code}&pageIndex=1&pageSize=1"
    try:
        resp = requests.get(url, headers=HEADERS, timeout=10)
        resp.encoding = 'utf-8'
        match = re.search(r'jQuery\((.*)\)$', resp.text, re.DOTALL)
        if not match:
            return None
        data = json.loads(match.group(1))
        if data.get("Data") and data["Data"].get("LSJZList"):
            item = data["Data"]["LSJZList"][0]
            return {
                "nav": float(item.get("DWJZ", 0) or 0),
                "navDate": item.get("FSRQ", ""),
                "returnRate": float(item.get("JZZZL", 0) or 0),
            }
        return None
    except Exception as e:
        print(f"  [警告] 净值 {code}: {e}")
        return None

def main():
    print(f"开始爬取... {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    results = []
    
    for i, fund in enumerate(FUNDS):
        code = fund["code"]
        name = fund["name"]
        print(f"[{i+1}/{len(FUNDS)}] {name} ({code})")
        
        result = {
            "id": str(i + 1),
            "name": name,
            "code": code,
            "returnRate": 0.0,
            "estimatedRate": 0.0,
            "estimatedValue": 0.0,
            "nav": 0.0,
            "navDate": "",
            "limit": "",
            "lastUpdated": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        }
        
        # 1. 实时估值
        rt = fetch_realtime(code)
        if rt:
            result["estimatedRate"] = rt["estimatedRate"]
            result["estimatedValue"] = rt["estimatedValue"]
            result["returnRate"] = rt["estimatedRate"]
            result["lastUpdated"] = rt["updateTime"]
            print(f"  估值: {rt['estimatedRate']:.2f}%")
        
        # 2. 净值
        nav = fetch_nav(code)
        if nav:
            result["nav"] = nav["nav"]
            result["navDate"] = nav["navDate"]
            if result["returnRate"] == 0:
                result["returnRate"] = nav["returnRate"]
            print(f"  净值: {nav['nav']:.4f}")
        
        # 3. 限额
        limit = fetch_limit(code)
        if limit:
            result["limit"] = limit
            print(f"  限额: {limit}")
        
        results.append(result)
        time.sleep(random.uniform(0.5, 1.5))
    
    # 保存
    output = {
        "updateTime": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "funds": results,
    }
    
    # public/data.json
    public_path = os.path.join(os.path.dirname(__file__), "..", "public", "data.json")
    os.makedirs(os.path.dirname(public_path), exist_ok=True)
    with open(public_path, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    print(f"\n已保存: {public_path}")
    
    # ../data/data.json
    data_path = os.path.join(os.path.dirname(__file__), "..", "..", "data", "data.json")
    os.makedirs(os.path.dirname(data_path), exist_ok=True)
    with open(data_path, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    print(f"已保存: {data_path}")
    
    print(f"\n完成! 更新时间: {output['updateTime']}")

if __name__ == "__main__":
    main()
