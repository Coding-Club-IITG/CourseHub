import 'package:flutter/material.dart';

void showSnackBar(String message, BuildContext context,
    {Duration duration = const Duration(milliseconds: 1000)}) {
  final snackbar = SnackBar(
    
    duration: duration,
    backgroundColor: Colors.black,
    content: Center(
      child: Text(
        message,
        textAlign: TextAlign.center,
        style: const TextStyle(color: Colors.white),
      ),
    ),
    behavior: SnackBarBehavior.floating,
    margin: const EdgeInsets.all(50),
  );

  ScaffoldMessenger.of(context).showSnackBar(snackbar);
}
