import 'dart:async';
import 'dart:io';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_easyloading/flutter_easyloading.dart';
import 'package:open_filex/open_filex.dart';
import 'package:path/path.dart';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';
import 'package:provider/provider.dart';

import '../../apis/files/get_link.dart';
import '../../providers/cache_provider.dart';
import '../../widgets/common/custom_snackbar.dart';

Future<Uint8List> downloader(String link) async {
  EasyLoading.showProgress(0, status: 'Downloading...');

  final completer = Completer<Uint8List>();
  final client = http.Client();
  final request = http.Request('GET', Uri.parse(link));
  final response = client.send(request);

  int downloadedBytes = 0;

  List<List<int>> chunkList = [];

  response.asStream().listen((streamResponse) {
    streamResponse.stream.listen((chunk) {
      final contentLength = streamResponse.contentLength ?? 0;
      double progress = (downloadedBytes / contentLength) * 100;
      EasyLoading.instance.textStyle = const TextStyle(
        color: Colors.white,
        fontWeight: FontWeight.w300,
      );
      EasyLoading.showProgress(progress / 100,
          status:
              '${progress.toStringAsFixed(2)}% \n ${(downloadedBytes / 1000000).toStringAsFixed(2)}MB out of ${(contentLength / 1000000).toStringAsFixed(2)}MB');

      chunkList.add(chunk);
      downloadedBytes += chunk.length;
    }, onDone: () {
      final contentLength = streamResponse.contentLength ?? 0;
      // final progress = (downloadedBytes / contentLength) * 100;

      EasyLoading.showSuccess('Downloaded');
      int start = 0;
      final bytes = Uint8List(contentLength);

      for (var chunk in chunkList) {
        bytes.setRange(start, start + chunk.length, chunk);
        start += chunk.length;
      }
      completer.complete(bytes);
    }, onError: (e) {
      EasyLoading.showError('Something Went Wrong!');
      completer.completeError(e);
    });
  });

  return completer.future;
}

Future<bool> isFileDownloaded(String fileName) async {
  final tempDirectory = await getTemporaryDirectory();

  final directory = Directory(tempDirectory.path);

  if (await directory.exists()) {
    final directory = await getApplicationDocumentsDirectory();
    final dir = directory.path;
    String pdfDirectory = '$dir/';
    final myDir = Directory(pdfDirectory);
    final folders = myDir.listSync(recursive: true, followLinks: false);

    for (var file in folders) {
      if (basename(file.path) == fileName) {
        return true;
      }
    }

    return false;
  } else {
    return false;
  }
}

Future<void> downloadOpenFiles(bool isDownloaded, String fileName,
    String fileId, BuildContext context) async {
  final cacheProvider = context.read<CacheProvider>();
  if (isDownloaded) {
    try {
      final tempDirectory = await getApplicationDocumentsDirectory();
      OpenFilex.open('${tempDirectory.path}/$fileName');
    } catch (e) {
       if (!context.mounted) {
        rethrow;
      }
      showSnackBar('Something went wrong!:$e', context);
    }
  } else if (isDownloaded == false) {
    try {
      final link = await getDownloadLink(fileId);

      cacheProvider.setIsDownloading(true);

      final filedata = await downloader(
        link,
      );

      final tempDirectory = await getApplicationDocumentsDirectory();

      File file = File('${tempDirectory.path}/$fileName');
      final raf = file.openSync(mode: FileMode.write);
      raf.writeFromSync(filedata);
      await raf.close();

      await OpenFilex.open(file.path);
      cacheProvider.setIsDownloading(false);
    } catch (e) {
      cacheProvider.setIsDownloading(false);
      debugPrint('$e');
       if (!context.mounted) {
        rethrow;
      }
      showSnackBar('Something Went Wrong!', context);
    }
  }
}
