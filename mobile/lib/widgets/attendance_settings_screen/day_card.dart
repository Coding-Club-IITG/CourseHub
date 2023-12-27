import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

class DayCard extends StatefulWidget {
  const DayCard({super.key});

  @override
  State<DayCard> createState() => _DayCardState();
}

class _DayCardState extends State<DayCard> {
  @override
  Widget build(BuildContext context) {
    return Container(
      height: 120,
      width: double.infinity,
      color: const Color.fromRGBO(71, 71, 71, 1),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            margin: const EdgeInsets.all(8),
            color: Colors.black,
            child: Text("JAn"),
          ),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              DayBanner(
                colorState: 1,
                showDate: DateTime.now(),
              ),
              DayBanner(
                colorState: 0,
                showDate: DateTime(2023,12,26),
              ),
            ],
          )

          // Expanded(child: Row(mainAxisSize: MainAxisSize.min,))
        ],
      ),
    );
  }
}

class DayBanner extends StatelessWidget {
  final int colorState;
  final DateTime showDate;
  const DayBanner(
      {super.key, required this.colorState, required this.showDate});

  @override
  Widget build(BuildContext context) {
    if (colorState < 2) {
      final Color color;

      if (colorState == 1) {
        color = const Color.fromRGBO(99, 163, 67, 1);
      } else {
        color = const Color.fromRGBO(203, 83, 69, 1);
      }
      return Column(
        children: [
          Container(
            height: 32,
            width: 32,
            decoration: BoxDecoration(
              color: color,
              borderRadius: const BorderRadius.all(Radius.circular(6)),
            ),
            child: Center(
              child: Text(
                showDate.day.toString(),
                style: const TextStyle(
                    fontSize: 14,
                    color: Colors.black,
                    fontWeight: FontWeight.w500),
              ),
            ),
          ),
          const SizedBox(
            height: 4,
          ),
          Text(
            DateFormat('EEEE').format(showDate).substring(0, 3),
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w400,
              color: color,
            ),
          )
        ],
      );
    } else {
      return Column(
        children: [
          Container(
            height: 32,
            width: 32,
            decoration: const BoxDecoration(
              color: Color.fromRGBO(99, 163, 67, 1),
              borderRadius: BorderRadius.all(Radius.circular(6)),
            ),
            child: Center(
              child: Text(
                showDate.day.toString(),
                style: const TextStyle(
                    fontSize: 14,
                    color: Colors.black,
                    fontWeight: FontWeight.w500),
              ),
            ),
          ),
          const SizedBox(
            height: 4,
          ),
          Text(
            DateFormat('EEEE').format(showDate).substring(0, 3),
            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w400),
          )
        ],
      );
    }
  }
}
