import 'package:flutter/material.dart';

void showSnackBar(String message,context) {
  final snackbar = SnackBar(
   elevation: 100,
   duration: const Duration(milliseconds: 1000),

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
