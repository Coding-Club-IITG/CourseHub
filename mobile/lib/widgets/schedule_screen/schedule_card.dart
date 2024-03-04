import 'dart:math';

import 'package:coursehub/constants/themes.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

class ScheduleCard extends StatelessWidget {
  const ScheduleCard(
      {super.key,
        required this.isUpcoming,
        required this.subject,
        required this.room,
        required this.from,
        required this.to});

  final bool isUpcoming;
  final String subject;
  final String room;
  final DateTime from;
  final DateTime to;

  @override
  Widget build(BuildContext context) {
    Color textColor = isUpcoming
        ? Colors.black // Set the color for upcoming events
        : const Color.fromRGBO(165, 165, 165, 1);
    Color bgColor = isUpcoming
        ? colors[Random().nextInt(colors.length)]
        : const Color.fromRGBO(37, 37, 37, 1);
    String start = DateFormat.jm().format(from);
    String end = DateFormat.jm().format(to);
    // String e=end.toString();
    return Container(
      margin: const EdgeInsets.fromLTRB(12, 16, 12, 16),
      padding: const EdgeInsets.fromLTRB(12, 16, 12, 16),
      decoration: BoxDecoration(color: bgColor),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            subject.toUpperCase(),
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
                '$start-$end',
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
                room.toUpperCase(),
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
