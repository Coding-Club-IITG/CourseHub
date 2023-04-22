import 'dart:async';

import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_easyloading/flutter_easyloading.dart';
import 'package:path/path.dart';

import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';

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
      EasyLoading.instance.textStyle = const TextStyle(color: Colors.white,fontWeight: FontWeight.w300,);
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
      EasyLoading.showError('Something Went Wrong !');
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
