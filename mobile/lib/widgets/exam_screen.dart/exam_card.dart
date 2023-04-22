import 'package:coursehub/constants/themes.dart';
import 'package:flutter/material.dart';

class ExamCard extends StatelessWidget {
  const ExamCard({super.key});

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
                          text: '3',
                          style: Themes.darkTextTheme.bodyMedium,
                        ),
                        TextSpan(
                          text: ' PM to ',
                          style: Themes.darkTextTheme.bodySmall,
                        ),
                        TextSpan(
                          text: '6',
                          style: Themes.darkTextTheme.bodyMedium,
                        ),
                        TextSpan(
                          text: ' PM',
                          style: Themes.darkTextTheme.bodySmall
                        ),
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
                  'CL304',
                  style: Themes.darkTextTheme.bodySmall,
                ),
                Text(
                  'Transport Phenomenon',
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
                        '4202 (Core 4)',
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
