import 'dart:math';

import 'package:flutter/material.dart';

class NoClassBanner extends StatelessWidget {
  const NoClassBanner({super.key});

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Image.asset(
          "assets/no_class.png",
          height: 160,
        ),
        const SizedBox(
          height: 5,
        ),
        SizedBox(
          width: 250,
          child: Text(
            noClassOneliners[Random().nextInt(noClassOneliners.length)],
            textAlign: TextAlign.center,
            style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
          ),
        )
      ],
    );
  }
}

const noClassOneliners = [
  "No classes? Sounds like a perfect day for a spontaneous adventure!",
  "No lectures, just freedom - let the fun times roll!",
  "Classes canceled? Time to major in relaxation studies!",
  "When classes take a break, mischief takes the stage!",
  "No classes today means it's officially 'Pursuit of Happiness' day!",
  "Lessons on hold? Let the unscheduled shenanigans begin!",
  "No classes, all sass - it's a day for unscripted fun!",
  "No lectures, just epic adventures waiting to happen!",
  "No class? Time to upgrade to 'Making Memories 101'!",
  "Finally, a breather from textbooks—time to embrace the wild side of life!"
];
