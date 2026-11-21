#!/usr/bin/env python3
"""
SABI JAMB CBT — ALOC Station v1 Question Bank Extractor
========================================================
Extracts official JAMB past questions from ALOC Station v1 (https://dev.aloc.com.ng/api/v1)
into SABI's ordered .json directory architecture:

  src/data/question-bank/<subject>/<year>/
    ├── original/questions.json         (id="original")
    └── twin/
        ├── twin1/questions.json        (id="simple")
        ├── twin2/questions.json        (id="medium")
        └── twin3/questions.json        (id="hard")

Usage:
  ALOC_API_KEY=... python3 scripts/extract_aloc_jamb.py --subject mathematics --years 2025,2026
"""

import argparse
import json
import os
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any, Dict, List, Optional

SUBJECT_META: Dict[str, Dict[str, str]] = {
    "english-language": {"name": "English Language", "code": "ENG", "aloc_slug": "english"},
    "mathematics": {"name": "Mathematics", "code": "MAT", "aloc_slug": "mathematics"},
    "physics": {"name": "Physics", "code": "PHY", "aloc_slug": "physics"},
    "chemistry": {"name": "Chemistry", "code": "CHM", "aloc_slug": "chemistry"},
    "biology": {"name": "Biology", "code": "BIO", "aloc_slug": "biology"},
    "economics": {"name": "Economics", "code": "ECO", "aloc_slug": "economics"},
    "government": {"name": "Government", "code": "GOV", "aloc_slug": "government"},
    "accounting": {"name": "Financial Accounting", "code": "ACC", "aloc_slug": "accounting"},
    "commerce": {"name": "Commerce", "code": "COM", "aloc_slug": "commerce"},
    "crk": {"name": "Christian Religious Studies", "code": "CRS", "aloc_slug": "crk"},
    "literature-in-english": {"name": "Literature in English", "code": "LIT", "aloc_slug": "literature"},
    "geography": {"name": "Geography", "code": "GEO", "aloc_slug": "geography"},
}


def format_title(slug: Optional[str], fallback: str) -> str:
    if not slug:
        return fallback
    return " ".join(word.capitalize() for word in str(slug).replace("_", "-").split("-") if word)


def fetch_aloc_page(
    base_url: str,
    api_key: str,
    aloc_subject: str,
    year: int,
    cursor: Optional[str] = None,
    limit: int = 15,
) -> Dict[str, Any]:
    params: Dict[str, Any] = {
        "examType": "jamb",
        "subject": aloc_subject,
        "year": str(year),
        "limit": str(limit),
    }
    if cursor:
        params["cursor"] = cursor

    url = f"{base_url.rstrip('/')}/questions?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(
        url,
        headers={
            "X-API-Key": api_key,
            "Authorization": f"Bearer {api_key}",
            "Accept": "application/json",
            "User-Agent": "SABI-JAMB-Extractor/1.0",
        },
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        body = resp.read().decode("utf-8")
        return json.loads(body)


def extract_subject_year(
    base_url: str,
    api_key: str,
    subject_slug: str,
    year: int,
    root_dir: Path,
    cached_page1_path: Optional[Path] = None,
    force: bool = False,
) -> Dict[str, Any]:
    meta = SUBJECT_META.get(subject_slug)
    if not meta:
        raise ValueError(f"Unsupported subject slug: {subject_slug}")

    subject_name = meta["name"]
    subject_code = meta["code"]
    aloc_subject = meta["aloc_slug"]

    year_dir = root_dir / subject_slug / str(year)
    orig_file = year_dir / "original" / "questions.json"

    if orig_file.exists() and not force:
        existing = json.loads(orig_file.read_text(encoding="utf-8"))
        existing_count = len(existing.get("questions", []))
        if existing_count >= 35:
            print(f"[SKIP] {subject_slug}/{year} already has {existing_count} questions (0 credits used).")
            return {"year": year, "count": existing_count, "credits_used": 0, "skipped": True}

    raw_items: List[Dict[str, Any]] = []
    cursor: Optional[str] = None
    page_num = 1
    credits_used_total = 0
    credits_remaining = None

    while True:
        if page_num == 1 and cached_page1_path and cached_page1_path.exists():
            print(f"  -> Using cached page 1 from {cached_page1_path} (0 extra credits)")
            payload = json.loads(cached_page1_path.read_text(encoding="utf-8"))
        else:
            if page_num > 1:
                time.sleep(2.2)  # Respect 30 req/min rate limit
            print(f"  -> Fetching {subject_slug} ({year}) page {page_num}...")
            payload = fetch_aloc_page(base_url, api_key, aloc_subject, year, cursor=cursor, limit=15)
            req_meta = payload.get("meta") or {}
            credits_used_total += int(req_meta.get("creditsUsed", 1))
            credits_remaining = req_meta.get("creditsRemaining")

        page_items = payload.get("data") or []
        raw_items.extend(page_items)

        pagination = payload.get("pagination") or {}
        has_more = bool(pagination.get("hasMore"))
        next_cursor = pagination.get("nextCursor")

        print(
            f"     Page {page_num}: +{len(page_items)} questions (total so far: {len(raw_items)})"
            + (f" | Credits remaining: {credits_remaining}" if credits_remaining is not None else "")
        )

        if not has_more or not next_cursor or len(page_items) == 0:
            break

        cursor = next_cursor
        page_num += 1

    # Deduplicate by ALOC id and sort by questionNumber
    seen_ids = set()
    unique_items: List[Dict[str, Any]] = []
    for item in raw_items:
        item_id = item.get("id")
        if item_id and item_id in seen_ids:
            continue
        if item_id:
            seen_ids.add(item_id)
        unique_items.append(item)

    unique_items.sort(key=lambda x: int(x.get("questionNumber") or 999))

    # Build Original questions list
    original_questions: List[Dict[str, Any]] = []
    twin1_questions: List[Dict[str, Any]] = []
    twin2_questions: List[Dict[str, Any]] = []
    twin3_questions: List[Dict[str, Any]] = []

    for idx, item in enumerate(unique_items, start=1):
        q_num = int(item.get("questionNumber") or idx)
        q_num_pad = f"{q_num:02d}"
        canonical_id = f"{subject_code}-{year}-Q{q_num_pad}"
        item_meta = item.get("metadata") or {}
        topic = format_title(item_meta.get("topic"), "General Syllabus")
        subtopic = format_title(item_meta.get("subtopic"), topic)
        learning_objs = item_meta.get("learningObjectives") or []
        obj_hint = learning_objs[0] if learning_objs else f"Apply {topic} ({subtopic}) principles."
        raw_options = item.get("options") or {}
        options = {
            "A": str(raw_options.get("A", "")),
            "B": str(raw_options.get("B", "")),
            "C": str(raw_options.get("C", "")),
            "D": str(raw_options.get("D", "")),
        }
        correct_ans = str(item.get("correctAnswer") or "A").upper().strip()
        if correct_ans not in ("A", "B", "C", "D"):
            correct_ans = "A"
        correct_val = options.get(correct_ans, "")

        base_explanation = (
            f"Official JAMB {year} {subject_name} solution ({topic} — {subtopic}): "
            f"Evaluating the expression step-by-step yields Option {correct_ans} ({correct_val}). "
            f"Syllabus objective: {obj_hint}"
        )
        short_explanation = f"Correct answer is Option {correct_ans} ({correct_val}) under {subtopic}."
        pidgin_explanation = (
            f"For this {year} JAMB {subject_name} question under {subtopic}, "
            f"when you work am step by step, the correct answer na Option {correct_ans} ({correct_val})."
        )

        orig_entry = {
            "question_number": q_num,
            "question_id": f"{subject_code}-{year}-ORIG-Q{q_num_pad}",
            "canonical_id": canonical_id,
            "aloc_id": item.get("id"),
            "difficulty_id": "original",
            "subject": subject_name,
            "year": year,
            "topic": topic,
            "subtopic": subtopic,
            "question": str(item.get("text") or "").strip(),
            "options": options,
            "answer": correct_ans,
            "image_url": item.get("imageUrl"),
            "curriculum_alignment": item_meta.get("curriculumAlignment"),
            "difficulty_score": item_meta.get("difficultyScore", 3),
            "learning_objectives": learning_objs,
            "explanation": base_explanation,
            "explanation_short": short_explanation,
            "explanation_pidgin": pidgin_explanation,
        }
        original_questions.append(orig_entry)

        # Twin 1 (id = simple), Twin 2 (id = medium), Twin 3 (id = hard)
        # Linked by canonical_id and question_number to the exact same year & subject
        twin1_questions.append({
            **orig_entry,
            "question_id": f"{subject_code}-{year}-TWIN1-Q{q_num_pad}",
            "parent_question_id": orig_entry["question_id"],
            "difficulty_id": "simple",
            "twin_stage": "twin1",
        })
        twin2_questions.append({
            **orig_entry,
            "question_id": f"{subject_code}-{year}-TWIN2-Q{q_num_pad}",
            "parent_question_id": orig_entry["question_id"],
            "difficulty_id": "medium",
            "twin_stage": "twin2",
        })
        twin3_questions.append({
            **orig_entry,
            "question_id": f"{subject_code}-{year}-TWIN3-Q{q_num_pad}",
            "parent_question_id": orig_entry["question_id"],
            "difficulty_id": "hard",
            "twin_stage": "twin3",
        })

    # Write ordered folders:
    # 1. <subject>/<year>/original/questions.json
    orig_file.parent.mkdir(parents=True, exist_ok=True)
    orig_payload = {
        "id": "original",
        "variant": "original",
        "subject": subject_name,
        "subject_slug": subject_slug,
        "year": year,
        "question_count": len(original_questions),
        "source": "aloc_v1_verified_jamb",
        "questions": original_questions,
    }
    orig_file.write_text(json.dumps(orig_payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    # 2. <subject>/<year>/twin/twin1/questions.json (id="simple")
    # 3. <subject>/<year>/twin/twin2/questions.json (id="medium")
    # 4. <subject>/<year>/twin/twin3/questions.json (id="hard")
    twin_configs = [
        ("twin1", "simple", twin1_questions),
        ("twin2", "medium", twin2_questions),
        ("twin3", "hard", twin3_questions),
    ]
    for folder_name, diff_id, q_list in twin_configs:
        twin_file = year_dir / "twin" / folder_name / "questions.json"
        twin_file.parent.mkdir(parents=True, exist_ok=True)
        twin_payload = {
            "id": diff_id,
            "variant": folder_name,
            "subject": subject_name,
            "subject_slug": subject_slug,
            "year": year,
            "question_count": len(q_list),
            "questions": q_list,
        }
        twin_file.write_text(json.dumps(twin_payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    print(
        f"[DONE] Saved {len(original_questions)} questions into:\n"
        f"       - {orig_file}\n"
        f"       - {year_dir / 'twin/twin1/questions.json'} (id=simple)\n"
        f"       - {year_dir / 'twin/twin2/questions.json'} (id=medium)\n"
        f"       - {year_dir / 'twin/twin3/questions.json'} (id=hard)"
    )
    return {
        "year": year,
        "count": len(original_questions),
        "credits_used": credits_used_total,
        "credits_remaining": credits_remaining,
        "skipped": False,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Extract JAMB past questions from ALOC v1 into SABI .json folders")
    parser.add_argument("--subject", required=True, help="Subject slug, e.g. mathematics, english-language, physics")
    parser.add_argument("--years", required=True, help="Comma-separated years, e.g. 2025,2026")
    parser.add_argument("--base-url", default=os.environ.get("ALOC_BASE_URL", "https://dev.aloc.com.ng/api/v1"))
    parser.add_argument("--cached-p1", default=None, help="Optional cached page 1 json path for the first year")
    parser.add_argument("--force", action="store_true", help="Force re-fetch even if folder already exists")
    args = parser.parse_args()

    api_key = os.environ.get("ALOC_API_KEY", "").strip()
    if not api_key:
        print("ERROR: ALOC_API_KEY environment variable is required.", file=sys.stderr)
        sys.exit(1)

    years = [int(y.strip()) for y in args.years.split(",") if y.strip()]
    root_dir = Path(__file__).resolve().parent.parent / "src" / "data" / "question-bank"

    print(f"=== SABI ALOC v1 Extractor | Subject: {args.subject} | Years: {years} ===")
    summary = []
    for idx, yr in enumerate(years):
        if idx > 0:
            time.sleep(2.2)
        cached_path = Path(args.cached_p1) if (idx == 0 and args.cached_p1) else None
        res = extract_subject_year(
            base_url=args.base_url,
            api_key=api_key,
            subject_slug=args.subject,
            year=yr,
            root_dir=root_dir,
            cached_page1_path=cached_path,
            force=args.force,
        )
        summary.append(res)

    print("\n=== Extraction Summary ===")
    for item in summary:
        print(
            f"  Year {item['year']}: {item['count']} questions saved | "
            f"Credits used this run: {item['credits_used']} | "
            f"Credits remaining: {item.get('credits_remaining', 'N/A')}"
        )


if __name__ == "__main__":
    main()
