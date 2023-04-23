import 'package:coursehub/constants/themes.dart';

import 'package:flutter/material.dart';

class ExamCard extends StatelessWidget {
  final dynamic exam;
  const ExamCard({super.key,required this.exam});

  @override
  Widget build(BuildContext context) {
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
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  RichText(
                    text: TextSpan(
                      children: [
                        TextSpan(
                          text: '9',
                          style: Themes.darkTextTheme.bodyMedium,
                        ),
                        TextSpan(
                          text: ' AM to ',
                          style: Themes.darkTextTheme.bodySmall,
                        ),
                        TextSpan(
                          text: '11',
                          style: Themes.darkTextTheme.bodyMedium,
                        ),
                        TextSpan(
                            text: ' AM', style: Themes.darkTextTheme.bodySmall),
                      ],
                    ),
                  ),
                  const Icon(Icons.access_time_sharp)
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
                  exam['code'],
                  style: Themes.darkTextTheme.bodySmall,
                ),
                Text(
                  exam['name'],
                  overflow: TextOverflow.ellipsis,
                  style: Themes.darkTextTheme.bodyLarge,
                ),
                Container(
                  transform: Matrix4.translationValues(-5, 0, 0),
                  child: Row(
                    children: [
                      const Icon(
                        Icons.location_on_outlined,
                      ),
                      Text(
                        exam['location'],
                        style: Themes.darkTextTheme.bodySmall,
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
