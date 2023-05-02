import 'package:coursehub/constants/themes.dart';
import 'package:coursehub/models/exam_details.dart';

import 'package:flutter/material.dart';

class ExamCard extends StatelessWidget {
  final ExamDetails exam;
  const ExamCard({super.key, required this.exam});

  @override
  Widget build(BuildContext context) {
    int start = int.parse(exam.time.split('-')[0].split(':')[0]);
    int end = int.parse(exam.time.split('-')[1].split(':')[0]);

    String startSub = '';
    String endSub = '';

    if (start >= 12) {
      if (start != 12) {
        start = start - 12;
      }
      startSub = 'PM';
    } else if (start < 12) {
      startSub = 'AM';
    }
    if (end >= 12) {
      if (end != 12) {
        end = end - 12;
      }
      endSub = 'PM';
    } else if (end < 12) {
      endSub = 'AM';
    }

    return Container(
      decoration: BoxDecoration(
        border: Border.all(width: 0.5, color: Colors.black),
      ),
      child: Column(
        children: [
          Container(
            decoration: const BoxDecoration(
              color: Themes.kYellow,
              border: Border(
                bottom: BorderSide(color: Colors.black, width: 0.5),
              ),
            ),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  RichText(
                    text: TextSpan(
                      children: [
                        TextSpan(
                          text: start.toString(),
                          style: Themes.darkTextTheme.bodyMedium,
                        ),
                        TextSpan(
                          text: ' $startSub to ',
                          style: Themes.darkTextTheme.bodySmall,
                        ),
                        TextSpan(
                          text: end.toString(),
                          style: Themes.darkTextTheme.bodyMedium,
                        ),
                        TextSpan(
                            text: ' $endSub',
                            style: Themes.darkTextTheme.bodySmall),
                      ],
                    ),
                  ),
                  const Icon(
                    Icons.access_time_sharp,
                    size: 18,
                  )
                ],
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(10),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  exam.code.toUpperCase(),
                  style: Themes.darkTextTheme.bodySmall,
                ),
                Text(
                  exam.name,
                  overflow: TextOverflow.ellipsis,
                  style: Themes.darkTextTheme.bodyLarge,
                ),
                const SizedBox(
                  height: 2,
                ),
                Container(
                  transform: Matrix4.translationValues(-5, 0, 0),
                  child: Row(
                    children: [
                      const Icon(
                        Icons.location_on_outlined,
                        size: 18,
                      ),
                      const SizedBox(
                        width: 2,
                      ),
                      Text(
                        roomCalculator(exam.room),
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w400,
                          color: Colors.black,
                        ),
                      ),
                    ],
                  ),
                )
              ],
            ),
          ),
        ],
      ),
    );
  }
}

String roomCalculator(String venue) {
  switch (venue[0]) {
    case '1':
      return '$venue (Core 1)';

    case '2':
      return '$venue (Core 2)';

    case '3':
      return '$venue (Core 3)';

    case '4':
      return '$venue (Core 4)';

    case '5':
      return '$venue (Core 5)';
    case 'L':
      return '$venue (Lecture Hall ${venue[venue.length - 1]})';
    default:
      return venue;
  }
}
