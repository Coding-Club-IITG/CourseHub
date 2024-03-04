import 'dart:math';

import 'package:coursehub/providers/navigation_provider.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../constants/themes.dart';
import 'Custom_percent.dart';

class AttendanceIndicator extends StatelessWidget {
  final int attendance;
  const AttendanceIndicator({super.key, required this.attendance});
  final Color textColor = Colors.black;
  @override
  Widget build(BuildContext context) {
    int remainder = 23 - attendance;

    final navigationProvider = context.read<NavigationProvider>();
    return GestureDetector(
      onTap: () {
        navigationProvider.changePageNumber(11);
      },
      child: Container(
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
                        style: TextStyle(
                          fontSize: 12,
                          color: textColor,
                        ),
                        children: remainder <= 0
                            ? [
                                TextSpan(
                                  text: 'Necessary classes attended',
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: textColor,
                                  ),
                                )
                              ]
                            : [
                                const TextSpan(
                                  text: 'You must attend ',
                                ),
                                TextSpan(
                                  text: '$remainder',
                                  style: const TextStyle(
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                const TextSpan(
                                  text: ' more classes',
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
      ),
    );
  }
}
