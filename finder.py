from typing import Set, Tuple, Optional, Dict, List
import csv
import os

def load_files(dict_path: str, alt_path: str) -> Tuple[Optional[Set[str]], Optional[Dict[str, str]]]:
  word_set: Set[str] = set()
  try:
    with open(dict_path, 'r', encoding='utf-8') as f:
      for line in f:
        word: str = line.strip()
        if word:
          word_set.add(word)
  except FileNotFoundError:
    print(f"ファイルが見つかりません: {dict_path}")
    return None, None
  char_map: Dict[str, str] = {}
  try:
    with open(alt_path, 'r', encoding='utf-8') as f:
      reader = csv.reader(f)
      for row in reader:
        if row and len(row) >= 2:
          src: str = row[0]
          dst: str = row[1]
          char_map[src] = dst
  except FileNotFoundError:
    print(f"ファイルが見つかりません: {alt_path}")
    return None, None
  return word_set, char_map

def find_shiftable_pairs(word_set: Set[str], char_map: Dict[str, str]) -> List[Tuple[str, str]]:
  found_pairs: List[Tuple[str, str]] = []

  for original_word in word_set:
    shifted_chars: List[str] = []
    for char in original_word:
      shifted_chars.append(char_map.get(char, char))
    shifted_word: str = ''.join(shifted_chars)
    if shifted_word in word_set:
      found_pairs.append((original_word, shifted_word))

  found_pairs.sort(key=lambda x: len(x[0]), reverse=True)
  return found_pairs

def main() -> None:
  # テキストファイル
  # 一般語辞典:  ippan.txt
  # 　仔豚辞典: kobuta.txt

  dict_path: str = os.path.join(os.path.dirname(__file__), 'dictionary/kobuta.txt')
  alt_path: str = os.path.join(os.path.dirname(__file__), 'alt.csv')
  output_path: str = os.path.join(os.path.dirname(__file__), 'output.csv')

  print('ファイルを読み込んでいます...')
  result = load_files(dict_path, alt_path)

  word_set_opt, char_map_opt = result

  if word_set_opt is None or char_map_opt is None:
    print('ファイルの読み込みに失敗しました。')
    return

  word_set: Set[str] = word_set_opt
  char_map: Dict[str, str] = char_map_opt

  pairs: List[Tuple[str, str]] = find_shiftable_pairs(word_set, char_map)

  print(f'見つかったペア: {len(pairs)} 組')

  try:
    with open(output_path, 'w', encoding='utf-8', newline='') as f:
      writer = csv.writer(f)
      writer.writerows(pairs)
    print(f'結果を保存しました: {output_path}')
  except IOError as e:
    print(f'結果の保存に失敗しました: {e}')

if __name__ == '__main__':
  main()