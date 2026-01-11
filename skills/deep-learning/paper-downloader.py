#!/usr/bin/env python3
"""
论文下载辅助脚本
支持从多个来源下载学术论文

使用方法:
    python paper-downloader.py --arxiv 1706.03762
    python paper-downloader.py --url "https://arxiv.org/abs/1706.03762"
    python paper-downloader.py --title "Attention Is All You Need"
    python paper-downloader.py --batch papers.txt
"""

import argparse
import os
import re
import sys
import urllib.request
import urllib.parse
import json
from pathlib import Path
from typing import Optional, Tuple

# 下载目录（默认为当前工作目录）
DEFAULT_DOWNLOAD_DIR = Path.cwd() / "learning-resources" / "papers"


def sanitize_filename(filename: str) -> str:
    """清理文件名，移除非法字符"""
    # 移除或替换非法字符
    filename = re.sub(r'[<>:"/\\|?*]', '_', filename)
    # 限制长度
    if len(filename) > 200:
        filename = filename[:200]
    return filename.strip()


def download_from_arxiv(arxiv_id: str, output_dir: Path) -> Tuple[bool, str]:
    """
    从arXiv下载论文

    参数:
        arxiv_id: arXiv论文ID (如: 1706.03762 或 2301.00234)
        output_dir: 下载目录

    返回:
        (成功与否, 消息或文件路径)
    """
    # 清理ID
    arxiv_id = arxiv_id.strip()
    if arxiv_id.startswith("arXiv:"):
        arxiv_id = arxiv_id[6:]

    # 构建URL
    pdf_url = f"https://arxiv.org/pdf/{arxiv_id}.pdf"
    abs_url = f"https://arxiv.org/abs/{arxiv_id}"

    try:
        # 获取论文标题用于命名
        print(f"正在获取论文信息: {abs_url}")

        # 尝试使用arXiv API获取元数据
        api_url = f"http://export.arxiv.org/api/query?id_list={arxiv_id}"
        with urllib.request.urlopen(api_url, timeout=30) as response:
            content = response.read().decode('utf-8')

        # 简单解析标题
        title_match = re.search(r'<title>([^<]+)</title>', content)
        if title_match and 'Error' not in title_match.group(1):
            title = title_match.group(1).strip()
            # 清理arXiv前缀
            if title.startswith('arXiv'):
                title = re.sub(r'^arXiv:\d+\.\d+v?\d*\s*', '', title)
        else:
            title = arxiv_id

        # 构建文件名
        filename = sanitize_filename(f"{arxiv_id}_{title}.pdf")
        filepath = output_dir / filename

        # 创建目录
        output_dir.mkdir(parents=True, exist_ok=True)

        # 下载PDF
        print(f"正在下载: {pdf_url}")
        urllib.request.urlretrieve(pdf_url, filepath)

        return True, str(filepath)

    except urllib.error.HTTPError as e:
        return False, f"HTTP错误 {e.code}: {e.reason}"
    except urllib.error.URLError as e:
        return False, f"URL错误: {e.reason}"
    except Exception as e:
        return False, f"下载失败: {str(e)}"


def download_from_url(url: str, output_dir: Path, filename: Optional[str] = None) -> Tuple[bool, str]:
    """
    从URL直接下载论文

    参数:
        url: 论文PDF的URL
        output_dir: 下载目录
        filename: 可选的文件名

    返回:
        (成功与否, 消息或文件路径)
    """
    try:
        # 解析URL
        parsed = urllib.parse.urlparse(url)

        # 检测并处理不同来源
        if 'arxiv.org' in parsed.netloc:
            # 从arXiv URL提取ID
            match = re.search(r'(\d{4}\.\d{4,5})(v\d+)?', url)
            if match:
                return download_from_arxiv(match.group(1), output_dir)

        # 直接下载
        if not filename:
            # 从URL提取文件名
            path_parts = parsed.path.split('/')
            filename = path_parts[-1] if path_parts[-1] else 'paper.pdf'
            if not filename.endswith('.pdf'):
                filename += '.pdf'

        filename = sanitize_filename(filename)
        filepath = output_dir / filename

        # 创建目录
        output_dir.mkdir(parents=True, exist_ok=True)

        print(f"正在下载: {url}")

        # 添加User-Agent头
        request = urllib.request.Request(
            url,
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
        )

        with urllib.request.urlopen(request, timeout=60) as response:
            with open(filepath, 'wb') as f:
                f.write(response.read())

        return True, str(filepath)

    except Exception as e:
        return False, f"下载失败: {str(e)}"


def search_paper(title: str) -> Optional[dict]:
    """
    通过标题搜索论文并尝试获取下载链接

    参数:
        title: 论文标题

    返回:
        包含论文信息的字典，或None
    """
    # 使用Semantic Scholar API搜索
    query = urllib.parse.quote(title)
    api_url = f"https://api.semanticscholar.org/graph/v1/paper/search?query={query}&limit=5&fields=title,authors,year,openAccessPdf,externalIds"

    try:
        request = urllib.request.Request(
            api_url,
            headers={'User-Agent': 'Mozilla/5.0'}
        )

        with urllib.request.urlopen(request, timeout=30) as response:
            data = json.loads(response.read().decode('utf-8'))

        if data.get('data'):
            for paper in data['data']:
                # 检查是否有开放获取的PDF
                if paper.get('openAccessPdf'):
                    return {
                        'title': paper.get('title', ''),
                        'year': paper.get('year', ''),
                        'pdf_url': paper['openAccessPdf'].get('url', ''),
                        'arxiv_id': paper.get('externalIds', {}).get('ArXiv', '')
                    }
                # 检查是否有arXiv ID
                elif paper.get('externalIds', {}).get('ArXiv'):
                    return {
                        'title': paper.get('title', ''),
                        'year': paper.get('year', ''),
                        'arxiv_id': paper['externalIds']['ArXiv'],
                        'pdf_url': f"https://arxiv.org/pdf/{paper['externalIds']['ArXiv']}.pdf"
                    }

        return None

    except Exception as e:
        print(f"搜索失败: {e}")
        return None


def download_by_title(title: str, output_dir: Path) -> Tuple[bool, str]:
    """
    通过论文标题搜索并下载

    参数:
        title: 论文标题
        output_dir: 下载目录

    返回:
        (成功与否, 消息或文件路径)
    """
    print(f"正在搜索: {title}")

    paper_info = search_paper(title)

    if not paper_info:
        return False, "未找到论文或没有可用的下载链接"

    print(f"找到论文: {paper_info.get('title', '')} ({paper_info.get('year', '')})")

    if paper_info.get('arxiv_id'):
        return download_from_arxiv(paper_info['arxiv_id'], output_dir)
    elif paper_info.get('pdf_url'):
        filename = f"{paper_info.get('year', '')}_{sanitize_filename(paper_info.get('title', 'paper'))}.pdf"
        return download_from_url(paper_info['pdf_url'], output_dir, filename)

    return False, "没有可用的下载链接"


def batch_download(file_path: str, output_dir: Path) -> None:
    """
    批量下载论文

    文件格式（每行一个）:
        arxiv:1706.03762
        url:https://example.com/paper.pdf
        title:Attention Is All You Need

    参数:
        file_path: 包含论文列表的文件路径
        output_dir: 下载目录
    """
    results = []

    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    for i, line in enumerate(lines, 1):
        line = line.strip()
        if not line or line.startswith('#'):
            continue

        print(f"\n[{i}/{len(lines)}] 处理: {line[:50]}...")

        if line.lower().startswith('arxiv:'):
            arxiv_id = line[6:].strip()
            success, msg = download_from_arxiv(arxiv_id, output_dir)
        elif line.lower().startswith('url:'):
            url = line[4:].strip()
            success, msg = download_from_url(url, output_dir)
        elif line.lower().startswith('title:'):
            title = line[6:].strip()
            success, msg = download_by_title(title, output_dir)
        else:
            # 默认当作标题处理
            success, msg = download_by_title(line, output_dir)

        results.append({
            'input': line,
            'success': success,
            'message': msg
        })

        print(f"  {'成功' if success else '失败'}: {msg}")

    # 打印汇总
    print("\n" + "="*50)
    print("下载汇总:")
    success_count = sum(1 for r in results if r['success'])
    print(f"  成功: {success_count}/{len(results)}")
    print(f"  失败: {len(results) - success_count}/{len(results)}")

    if any(not r['success'] for r in results):
        print("\n失败列表:")
        for r in results:
            if not r['success']:
                print(f"  - {r['input']}: {r['message']}")


def main():
    parser = argparse.ArgumentParser(
        description='论文下载辅助工具',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
    python paper-downloader.py --arxiv 1706.03762
    python paper-downloader.py --url "https://arxiv.org/pdf/1706.03762.pdf"
    python paper-downloader.py --title "Attention Is All You Need"
    python paper-downloader.py --batch papers.txt
    python paper-downloader.py --arxiv 1706.03762 --output ~/my-papers/
        """
    )

    parser.add_argument('--arxiv', type=str, help='arXiv论文ID')
    parser.add_argument('--url', type=str, help='论文PDF的URL')
    parser.add_argument('--title', type=str, help='论文标题（将搜索并尝试下载）')
    parser.add_argument('--batch', type=str, help='批量下载，指定包含论文列表的文件')
    parser.add_argument('--output', type=str, default=str(DEFAULT_DOWNLOAD_DIR),
                        help=f'下载目录 (默认: {DEFAULT_DOWNLOAD_DIR})')

    args = parser.parse_args()

    output_dir = Path(args.output)

    if not any([args.arxiv, args.url, args.title, args.batch]):
        parser.print_help()
        sys.exit(1)

    if args.arxiv:
        success, msg = download_from_arxiv(args.arxiv, output_dir)
        print(f"{'成功' if success else '失败'}: {msg}")
        sys.exit(0 if success else 1)

    if args.url:
        success, msg = download_from_url(args.url, output_dir)
        print(f"{'成功' if success else '失败'}: {msg}")
        sys.exit(0 if success else 1)

    if args.title:
        success, msg = download_by_title(args.title, output_dir)
        print(f"{'成功' if success else '失败'}: {msg}")
        sys.exit(0 if success else 1)

    if args.batch:
        if not os.path.exists(args.batch):
            print(f"错误: 文件不存在: {args.batch}")
            sys.exit(1)
        batch_download(args.batch, output_dir)


if __name__ == '__main__':
    main()
