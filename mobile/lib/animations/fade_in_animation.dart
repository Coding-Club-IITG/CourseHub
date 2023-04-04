import 'package:flutter/material.dart';

class CustomFadeInAnimation extends StatelessWidget {
  final Widget child;
  const CustomFadeInAnimation({super.key, required this.child});

  @override
  Widget build(BuildContext context) {

    return TweenAnimationBuilder(
      tween: Tween<double>(begin: 0, end: 1),
      duration: const Duration(milliseconds: 200),
      builder: (context, value, child) {
        return Opacity(
          opacity: value,
          child: child,
        );
      },
      child: child,
    );
  }
}
