﻿using System;
using System.Data.Linq;
using System.Data.Linq.Mapping;

namespace JSDstr.Models
{
    [Table]
    public class CentroidAssignment : BaseModel
    {
        [Column(IsPrimaryKey = true, IsDbGenerated = true, UpdateCheck = UpdateCheck.Never)]
        public override int Id { get; set; }
        [Column(UpdateCheck = UpdateCheck.Never)]
        public override DateTime CreatedDate { get; set; }
        [Column(UpdateCheck = UpdateCheck.Never)]
        public override DateTime ChangedDate { get; set; }

        [Column(UpdateCheck = UpdateCheck.Never)]
        public int? CentroidId { get; set; }

        [Column(UpdateCheck = UpdateCheck.Never)]
        public int? Vectorid { get; set; }

        [Column(UpdateCheck = UpdateCheck.Never)]
        public int CalculationId { get; set; }

        [Column(UpdateCheck = UpdateCheck.Never)]
        public int Iteration { get; set; }
    }
}