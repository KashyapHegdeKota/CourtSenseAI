# parallel_download.py
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from tqdm import tqdm
from SoccerNet.Downloader import SoccerNetDownloader, getListGames

# Target destination directory
LOCAL_DIR = "./SoccerNetData"
NUM_WORKERS = 16  # Adjust based on your network bandwidth (8–32 works well)

def download_single_game(game_path, files):
    """Worker function to download specific files for a single match."""
    try:
        downloader = SoccerNetDownloader(LocalDirectory=LOCAL_DIR)
        downloader.downloadGame(game=game_path, files=files)
        return True, game_path
    except Exception as e:
        return False, f"{game_path} - Error: {e}"

def parallel_download_games(files_to_download, splits=["train", "valid", "test"], max_workers=16):
    os.makedirs(LOCAL_DIR, exist_ok=True)
    
    # 1. Fetch official SoccerNet game path lists for all splits
    all_games = []
    for split in splits:
        games = getListGames(split=split)
        all_games.extend(games)
    
    # Remove duplicate game paths
    all_games = list(set(all_games))
    print(f"Total matches to download: {len(all_games)} across splits: {splits}")
    print(f"Target files: {files_to_download}")
    print(f"Running with {max_workers} parallel worker threads...\n")

    # 2. Execute parallel downloads with progress bar
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {
            executor.submit(download_single_game, game, files_to_download): game 
            for game in all_games
        }
        
        with tqdm(total=len(futures), desc="Downloading Matches", unit="game") as pbar:
            for future in as_completed(futures):
                success, msg = future.result()
                if not success:
                    tqdm.write(f"Failed: {msg}")
                pbar.update(1)

if __name__ == "__main__":
    # Example 1: Download Action Spotting JSON annotations (Takes ~10 seconds with 16 threads)
    parallel_download_games(
        files_to_download=["Labels-v2.json"],
        splits=["train", "valid", "test"],
        max_workers=NUM_WORKERS
    )

    # Example 2: To download 720p or 224p video halves, pass the video filenames:
    # parallel_download_games(
    #     files_to_download=["1_720p.mkv", "2_720p.mkv"],
    #     splits=["train", "valid", "test"],
    #     max_workers=NUM_WORKERS
    # )