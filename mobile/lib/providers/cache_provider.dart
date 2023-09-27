import 'package:flutter/material.dart';

class CacheProvider extends ChangeNotifier {
  bool isDownloading = false;

  void setIsDownloading(bool value) {
    isDownloading = value;
    notifyListeners();
  }

 
}
