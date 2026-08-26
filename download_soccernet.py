from SoccerNet.Downloader import SoccerNetDownloader

downloader = SoccerNetDownloader(LocalDirectory = "./SoccerNetData")

downloader.downloadDataTask(task = "tracking", split= ["train", "test", "valid"])