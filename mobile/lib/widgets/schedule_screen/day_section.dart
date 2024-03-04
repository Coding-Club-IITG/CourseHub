import 'package:flutter/material.dart';

class DaySection extends StatelessWidget {
  final String section;
  final int numClasses;
  DaySection({super.key, required this.section,required this.numClasses});

  @override
  Widget build(BuildContext context) {
    return  Column(
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                section,
                style: const TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.w400),
              ),
              Text(
                '$numClasses Classes',
                style: const TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.w400),
              ),
            ],
          ),
        ),
        const Divider(
          color: Color.fromRGBO(133, 133, 133, 1),
          thickness: 1,
        ),
      ],
    );
  }
}
