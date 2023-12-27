import 'package:flutter/material.dart';
import 'package:percent_indicator/circular_percent_indicator.dart';

class CustomPercent extends StatelessWidget {
  final int attendance;
  const CustomPercent({
    super.key,
    required this.attendance,
  });
  @override
  Widget build(BuildContext context) {
    double percentage = (attendance / 30) * 100;
    return Stack(
      alignment: Alignment.center,
      children: [
        CircularPercentIndicator(
          radius: 40,
          lineWidth: 6,
          fillColor: Colors.transparent,
          percent: percentage % 100 / 100,
          circularStrokeCap: CircularStrokeCap.round,
          backgroundColor: const Color.fromRGBO(0, 0, 0, 0.2),
          progressColor: Colors.black,
    
          animation: true,
          animationDuration: 1000,
          center: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Text(
                '${percentage.round()}%',
                style: const TextStyle(
                  color: Colors.black,
                  fontWeight: FontWeight.bold,
                  fontSize: 20,
                ),
              ),
              Text(
                '$attendance/30',
                style: const TextStyle(
                  color: Colors.black,
                  fontSize: 10,
                ),
              )
            ],
          ),
        ),
        CircularPercentIndicator(
          radius: 40,
          lineWidth: 6,
          fillColor: Colors.transparent,
          percent: 0.01,
          circularStrokeCap: CircularStrokeCap.butt,
          backgroundColor: Colors.transparent,
          progressColor: Colors.black,
          startAngle: 0.75 * 360,
          // TODO: Change this
        )
      ],
    );
  }
}
