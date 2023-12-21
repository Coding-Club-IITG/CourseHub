import 'dart:math';

import 'package:coursehub/constants/themes.dart';
import 'package:flutter/material.dart';

class ScheduleCard extends StatelessWidget {
  const ScheduleCard({super.key, required this.isUpcoming});
  final bool isUpcoming;

  @override
  Widget build(BuildContext context) {
    Color textColor = isUpcoming
        ? Colors.black // Set the color for upcoming events
        : const Color.fromRGBO(165, 165, 165, 1);
    Color bgColor = isUpcoming
        ? colors[Random().nextInt(colors.length)]
        : const Color.fromRGBO(37, 37, 37, 1);

    return Container(
      margin: const EdgeInsets.fromLTRB(12, 16, 12, 16),
      padding: const EdgeInsets.fromLTRB(12, 16, 12, 16),
      decoration: BoxDecoration(color: bgColor),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Process Control And Implementation',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: textColor,
            ),
          ),
          const SizedBox(
            height: 10,
          ),
          Row(
            children: [
              Icon(
                Icons.access_time_sharp,
                size: 12,
                color: textColor,
              ),
              const SizedBox(
                width: 3,
              ),
              Text(
                '8:00-10:00',
                style: TextStyle(
                  fontSize: 12, // Adjust the font size as needed
                  color: textColor, // Adjust the text color as needed
                ),
              ),
              const SizedBox(
                width: 8,
              ),
              Text(
                '•',
                style: TextStyle(
                  fontSize: 16, // Adjust the font size as needed
                  color: textColor, // Adjust the text color as needed
                ),
              ),
              const SizedBox(
                width: 8,
              ),
              Icon(
                Icons.location_on_outlined,
                size: 12,
                color: textColor,
              ),
              const SizedBox(
                width: 3,
              ),
              Text(
                'Lecture Hall 1',
                style: TextStyle(
                  fontSize: 12, // Adjust the font size as needed
                  color: textColor, // Adjust the text color as needed
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
