

import 'package:coursehub/constants/themes.dart';

import 'package:coursehub/providers/navigation_provider.dart';
import 'package:flutter/material.dart';
import 'package:flutter_svg/svg.dart';
import 'package:provider/provider.dart';

class ExamDialog extends StatelessWidget {
  const ExamDialog({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 60,
      padding: const EdgeInsets.all(12),
      decoration: const BoxDecoration(
          color: Themes.kYellow,
          borderRadius: BorderRadius.all(
            Radius.circular(8),
          )),
      child: Row(
        children: [
          SvgPicture.asset(
            'assets/exam_clock.svg',
            height: 40,
          ),
          const SizedBox(
            width: 10,
          ),
          const Text(
            'View you Exam\nSchedule and venue!',
            style: TextStyle(color: Colors.black, fontSize: 13),
          ),
          const Spacer(),
          Material(
            color: Colors.black,
            borderRadius: const BorderRadius.all(
              Radius.circular(8),
            ),
            child: InkWell(
              onTap: () {
                context.read<NavigationProvider>().changePageNumber(6);
              },
              splashColor: Colors.grey,
              child: const Padding(
                padding: EdgeInsets.symmetric(vertical: 11, horizontal: 8),
                child: Text(
                  'Exam Schedule',
                  style: TextStyle(fontSize: 13),
                ),
              ),
            ),
          )
        ],
      ),
    );
  }
}
