import 'dart:math';

import 'package:coursehub/widgets/attendance_screen/custom_percent.dart';
import 'package:flutter/material.dart';

import '../../constants/themes.dart';

class AttendanceIndicator extends StatelessWidget {
  final int attendance;
  const AttendanceIndicator({super.key, required this.attendance});
  @override
  Widget build(BuildContext context) {
    Color textColor = Colors.black;
    int remainder = 23 - attendance;
    return Container(
      color: colors[Random().nextInt(colors.length)],
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            SizedBox(
              width: 200,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Process Control And Implementation',
                    softWrap: true,
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: textColor,
                    
                    ),
                  ),
                  const SizedBox(height: 24),
                  RichText(
                    text: TextSpan(
                      children: [
                        TextSpan(
                          text: 'You must attend ',
                          style: TextStyle(
                            fontSize: 12,
                            color: textColor,
                          ),
                        ),
                        TextSpan(
                          text: '$remainder',
                          style: TextStyle(
                            fontSize: 12,
                            color: textColor,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        TextSpan(
                          text: ' more classes',
                          style: TextStyle(
                            fontSize: 12,
                            color: textColor,
                          ),
                        ),
                      ],
                    ),
                  )
                ],
              ),
            ),
            CustomPercent(attendance: attendance),
          ],
        ),
      ),
    );
  }
}
